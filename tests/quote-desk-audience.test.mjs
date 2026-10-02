import assert from "node:assert/strict"
import fs from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { initDesk, intake, show, editDraft, clarify, history, recover, exportDraft, main } from "../scripts/quote-desk.mjs"

const rootRepo = fileURLToPath(new URL("../", import.meta.url))
const load = (name) => JSON.parse(fs.readFileSync(join(rootRepo, name), "utf8"))
const principal = load("skills/quote-desk/examples/principal.json")
const catalog = load("skills/quote-desk/examples/catalog.json")
const frozen = load("tests/fixtures/quote-desk-ten.json")
const cases = load("docs/evidence/quote-audience-2026-10-02/cases.json")
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")

function setup(t, task = "Q08") {
  const root = fs.mkdtempSync(join(tmpdir(), "starlight-audience-test-"))
  t.after(() => {
    const target = resolve(root)
    assert.equal(target, root)
    assert.equal(resolve(target, ".."), resolve(tmpdir()))
    assert.ok(target.split(/[\\/]/).at(-1).startsWith("starlight-audience-test-"))
    fs.rmSync(target, { recursive: true })
  })
  const workspace = join(root, "desk")
  initDesk(workspace, principal, catalog)
  const request = structuredClone(frozen.cases.find((entry) => entry.id === task).input)
  return { root, workspace, request, initial: intake(workspace, request, "inspect", 1) }
}

test("atomic buyer/owner edit survives duplicate, new process and exact separately hashed export", (t) => {
  const { root, workspace, request, initial } = setup(t)
  const buyer = "Thank you for your inspection request. Draft amount EUR 120.00.\r\n"
  const owner = "Internal sentinel: CRM unavailable.\r\n````\n# Keep this as literal data.\n"
  const buyerFile = join(root, "buyer.txt"), ownerFile = join(root, "owner.txt")
  fs.writeFileSync(buyerFile, buyer); fs.writeFileSync(ownerFile, owner)
  const saved = main(["edit", "--workspace", workspace, "--id", initial.id, "--revision", "1", "--draft", buyerFile, "--owner-notes", ownerFile])
  assert.equal(saved.revision, 2)
  assert.deepEqual(saved.record.price, initial.record.price)
  assert.equal(intake(workspace, request, "inspect", 1).snapshotHash, saved.snapshotHash)
  const reopened = spawnSync(process.execPath, [join(rootRepo, "scripts/quote-desk.mjs"), "show", "--workspace", workspace, "--id", initial.id], { encoding: "utf8", timeout: 10000 })
  assert.equal(reopened.status, 0, reopened.stderr)
  assert.equal(JSON.parse(reopened.stdout).record.ownerNotes, owner)
  const packet = exportDraft(workspace, initial.id, join(root, "packet"))
  assert.deepEqual(fs.readFileSync(join(packet.directory, "quote.txt")), Buffer.from(buyer))
  assert.deepEqual(fs.readFileSync(join(packet.directory, "owner-notes.txt")), Buffer.from(owner))
  assert.doesNotMatch(fs.readFileSync(join(packet.directory, "quote.txt"), "utf8"), /Internal sentinel/)
  assert.match(fs.readFileSync(join(packet.directory, "quote.md"), "utf8"), /`````text\nInternal sentinel/)
  assert.equal(packet.receipt.packetAudience, "owner-review")
  for (const [name, sha] of Object.entries(packet.receipt.files)) assert.equal(hash(fs.readFileSync(join(packet.directory, name))), sha)
  assert.equal(packet.receipt.approvalsVerified, false)
})

test("notes-only edits retain arrangement origin and pending buyer-wording reconciliation", (t) => {
  const { workspace, initial } = setup(t)
  const notesOnly = editDraft(workspace, initial.id, 1, undefined, "Internal source review note.")
  assert.equal(notesOnly.record.draftOrigin, "catalogue-arrangement")
  editDraft(workspace, initial.id, 2, "Draft amount EUR 120.00.")
  clarify(workspace, initial.id, 3, { service: "inspect", quantity: 2, note: "Owner supplied two units.", sourceReference: "synthetic-owner-reply" })
  const updated = editDraft(workspace, initial.id, 4, undefined, "Two units now require buyer-wording review.")
  assert.equal(updated.record.draft, "Draft amount EUR 120.00.")
  assert.equal(updated.record.wordingReviewRequired, true)
  assert.equal(updated.record.price.subtotal, "240.00")
})

test("draft-only preserves notes, empty notes explicitly clear, stale and empty edits refuse", (t) => {
  const { root, workspace, initial } = setup(t)
  editDraft(workspace, initial.id, 1, undefined, "Keep this owner note.")
  const changed = editDraft(workspace, initial.id, 2, "Updated buyer draft.")
  assert.equal(changed.record.ownerNotes, "Keep this owner note.")
  assert.throws(() => editDraft(workspace, initial.id, 2, undefined, "Stale notes"), /Revision changed/)
  assert.throws(() => editDraft(workspace, initial.id, 3), /Supply buyer wording or owner notes/)
  assert.throws(() => main(["edit", "--workspace", workspace, "--id", initial.id, "--revision", "3"]), /Supply buyer wording or owner notes/)
  const empty = join(root, "empty.txt"); fs.writeFileSync(empty, "")
  const cleared = main(["edit", "--workspace", workspace, "--id", initial.id, "--revision", "3", "--owner-notes", empty])
  assert.equal(cleared.record.ownerNotes, "")
  assert.equal(cleared.record.draft, "Updated buyer draft.")
  assert.throws(() => editDraft(workspace, initial.id, 4, ""), /bounded plain text/)
})

test("legacy snapshots reopen with empty notes without changing stored bytes or hashes", (t) => {
  const { workspace, initial } = setup(t)
  const snapshotPath = join(workspace, "history", initial.snapshot)
  const record = JSON.parse(fs.readFileSync(snapshotPath)); delete record.ownerNotes
  const raw = Buffer.from(JSON.stringify(record, null, 2) + "\n")
  fs.writeFileSync(snapshotPath, raw)
  const pointerPath = join(workspace, "records", initial.id + ".json")
  const pointer = JSON.parse(fs.readFileSync(pointerPath)); pointer.sha256 = hash(raw)
  fs.writeFileSync(pointerPath, JSON.stringify(pointer, null, 2) + "\n")
  const pointerBytes = fs.readFileSync(pointerPath)
  assert.equal(show(workspace, initial.id).record.ownerNotes, "")
  assert.deepEqual(fs.readFileSync(snapshotPath), raw)
  assert.deepEqual(fs.readFileSync(pointerPath), pointerBytes)
  const packet = exportDraft(workspace, initial.id, join(workspace, "..", "legacy packet"))
  assert.equal(fs.readFileSync(join(packet.directory, "owner-notes.txt"), "utf8"), "")
  const noted = editDraft(workspace, initial.id, 1, undefined, "Notes added to legacy work.")
  assert.equal(noted.record.draft, record.draft)
  assert.equal(noted.record.ownerNotes, "Notes added to legacy work.")
  assert.deepEqual(fs.readFileSync(snapshotPath), raw)
})

test("an oversized multibyte text-pair edit refuses before writing any unreadable snapshot", (t) => {
  const { workspace, initial } = setup(t)
  const record = structuredClone(initial.record)
  record.clarifications = Array.from({ length: 50 }, () => ({ service: "inspect", quantity: 1, note: "語".repeat(2000), sourceReference: "参".repeat(512) }))
  const raw = Buffer.from(JSON.stringify(record, null, 2) + "\n")
  assert.ok(raw.length < 512 * 1024)
  fs.writeFileSync(join(workspace, "history", initial.snapshot), raw)
  const pointerPath = join(workspace, "records", initial.id + ".json")
  const pointer = JSON.parse(fs.readFileSync(pointerPath)); pointer.sha256 = hash(raw)
  fs.writeFileSync(pointerPath, JSON.stringify(pointer, null, 2) + "\n")
  const before = show(workspace, initial.id)
  const files = fs.readdirSync(join(workspace, "history"))
  assert.throws(() => editDraft(workspace, initial.id, 1, "文".repeat(32768), "注".repeat(32768)), /Saved record would exceed 512 KiB/)
  assert.equal(show(workspace, initial.id).snapshotHash, before.snapshotHash)
  assert.deepEqual(fs.readdirSync(join(workspace, "history")), files)
  assert.equal(fs.existsSync(join(workspace, ".writer.lock")), false)
})

test("invalid notes and unreadable second text input leave both saved fields unchanged", (t) => {
  const { root, workspace, initial } = setup(t)
  const buyer = join(root, "buyer.txt"), owner = join(root, "owner.txt")
  fs.writeFileSync(buyer, "A buyer draft that must not be committed on failure.")
  for (const bytes of [Buffer.from([0xc3, 0x28]), Buffer.from("\ufeffBOM note"), Buffer.from("Spoof\u202eamount")]) {
    fs.writeFileSync(owner, bytes)
    assert.throws(() => main(["edit", "--workspace", workspace, "--id", initial.id, "--revision", "1", "--draft", buyer, "--owner-notes", owner]))
    assert.equal(show(workspace, initial.id).snapshotHash, initial.snapshotHash)
    assert.deepEqual(fs.readFileSync(owner), bytes)
  }
  for (const invalid of [null, 1, " ", "x".repeat(32769), "\ud800", "\u0085bad"]) {
    assert.throws(() => editDraft(workspace, initial.id, 1, undefined, invalid))
    assert.equal(show(workspace, initial.id).snapshotHash, initial.snapshotHash)
  }
})

test("interrupted pointer replacement keeps old text pair and explicit recovery restores the new pair", (t) => {
  const { workspace, initial } = setup(t)
  const rename = fs.renameSync
  fs.renameSync = () => { throw new Error("Simulated interrupted text-pair commit") }
  try { assert.throws(() => editDraft(workspace, initial.id, 1, "Saved buyer sentence.", "Saved owner sentinel."), /interrupted text-pair commit/) }
  finally { fs.renameSync = rename }
  assert.equal(show(workspace, initial.id).snapshotHash, initial.snapshotHash)
  const listed = history(workspace, initial.id)
  const pending = listed.entries.find((entry) => entry.revision === 2)
  assert.equal(pending.selectedByCurrentPointer, false)
  recover(workspace, initial.id, pending.snapshot, pending.sha256, listed.pointerHash)
  const restored = show(workspace, initial.id)
  assert.equal(restored.record.draft, "Saved buyer sentence.")
  assert.equal(restored.record.ownerNotes, "Saved owner sentinel.")
  assert.equal(restored.record.outbound, "disabled")
})

for (const entry of cases.cases) test(`${entry.id} refined buyer wording exports independently of scenario/owner notes`, (t) => {
  const { root, workspace, request, initial } = setup(t, entry.id)
  editDraft(workspace, initial.id, 1, entry.buyerWording, entry.ownerNotes)
  const duplicate = intake(workspace, request, "inspect", 1)
  assert.equal(duplicate.revision, 2)
  assert.equal(duplicate.record.ownerNotes, entry.ownerNotes)
  const packet = exportDraft(workspace, initial.id, join(root, "refined packet"))
  assert.equal(fs.readFileSync(join(packet.directory, "quote.txt"), "utf8"), entry.buyerWording)
  assert.equal(fs.readFileSync(join(packet.directory, "owner-notes.txt"), "utf8"), entry.ownerNotes)
  assert.equal(packet.receipt.wordingReviewRequired, false)
  assert.equal(packet.receipt.outbound, "disabled")
})

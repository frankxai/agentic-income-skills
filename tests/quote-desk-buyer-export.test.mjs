import assert from "node:assert/strict"
import fs from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { initDesk, intake, show, editDraft, clarify, exportDraft, exportBuyerDraft, main } from "../scripts/quote-desk.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const load = (name) => JSON.parse(fs.readFileSync(join(repo, name), "utf8"))
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")
function setup(t) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), "starlight-buyer-test-")))
  t.after(() => {
    assert.equal(resolve(root, ".."), fs.realpathSync(tmpdir()))
    assert.ok(root.split(/[\\/]/).at(-1).startsWith("starlight-buyer-test-"))
    fs.rmSync(root, { recursive: true })
  })
  const workspace = join(root, "desk")
  const principal = load("skills/quote-desk/examples/principal.json")
  const catalog = load("skills/quote-desk/examples/catalog.json")
  const request = load("skills/quote-desk/examples/request.json")
  principal.name = "PRIVATE_OWNER_SENTINEL"
  catalog.items[1].name = "PRIVATE_UNUSED_SERVICE_SENTINEL"
  request.contact.name = "PRIVATE_CONTACT_SENTINEL"
  request.summary = "PRIVATE_REQUEST_SENTINEL: workshop inspection required."
  initDesk(workspace, principal, catalog)
  const initial = intake(workspace, request, "inspect", 1)
  const draft = "Thank you for your inspection request. Draft amount EUR 120.00; scope, tax and timing require confirmation.\r\n"
  const saved = editDraft(workspace, initial.id, 1, draft, "PRIVATE_NOTES_SENTINEL: source and connector review required.")
  return { root, workspace, initial, saved, draft }
}
function exportSelected(s, output) { return exportBuyerDraft(s.workspace, s.saved.id, s.saved.revision, s.saved.snapshotHash, output) }

test("buyer export reopens an exact selected draft and omits all separate internal payload", (t) => {
  const s = setup(t), output = join(s.root, "buyer packet")
  const run = spawnSync(process.execPath, [join(repo, "scripts/quote-desk.mjs"), "export-buyer", "--workspace", s.workspace, "--id", s.saved.id,
    "--revision", String(s.saved.revision), "--snapshot-sha256", s.saved.snapshotHash, "--output", output], { encoding: "utf8", timeout: 10000 })
  assert.equal(run.status, 0, run.stderr)
  const result = JSON.parse(run.stdout)
  assert.equal(result.snapshotHash, s.saved.snapshotHash)
  assert.equal(show(s.workspace, s.saved.id).snapshotHash, s.saved.snapshotHash)
  assert.deepEqual(fs.readdirSync(output).sort(), ["LICENSE", "README.md", "quote.txt", "receipt.json"])
  assert.deepEqual(fs.readFileSync(join(output, "quote.txt")), Buffer.from(s.draft))
  for (const [name, expected] of Object.entries(result.receipt.files)) assert.equal(hash(fs.readFileSync(join(output, name))), expected)
  const contents = fs.readdirSync(output).map((name) => fs.readFileSync(join(output, name), "utf8")).join("\n")
  assert.doesNotMatch(contents, /PRIVATE_.*_SENTINEL/)
  assert.ok(!contents.includes(s.saved.id) && !contents.includes(s.saved.snapshotHash) && !contents.includes(s.saved.record.requestHash))
  assert.equal(result.receipt.approvalsVerified, false)
  assert.equal(result.receipt.proseReviewRequired, true)
  assert.equal(result.receipt.outbound, "disabled")
  assert.equal(result.receipt.synthetic, true)
  assert.deepEqual(fs.readFileSync(join(output, "LICENSE")), fs.readFileSync(join(repo, "skills/quote-desk/LICENSE")))
  const internal = exportDraft(s.workspace, s.saved.id, join(s.root, "internal packet"))
  assert.match(fs.readFileSync(join(internal.directory, "owner-notes.txt"), "utf8"), /PRIVATE_NOTES_SENTINEL/)
  assert.equal(internal.receipt.packetAudience, "owner-review")
})

test("stale revision or hash and malformed selection refuse before creating an output", (t) => {
  const s = setup(t), output = join(s.root, "refused")
  for (const [rev, sha] of [[1, s.saved.snapshotHash], [2, "0".repeat(64)], [0, s.saved.snapshotHash], [Number.MAX_SAFE_INTEGER + 1, s.saved.snapshotHash], [2, "not-a-hash"]]) {
    assert.throws(() => exportBuyerDraft(s.workspace, s.saved.id, rev, sha, output), /snapshot|revision/i)
    assert.equal(fs.existsSync(output), false)
    assert.equal(show(s.workspace, s.saved.id).snapshotHash, s.saved.snapshotHash)
  }
  editDraft(s.workspace, s.saved.id, 2, "Newer wording must not be selected by a stale command.")
  assert.throws(() => exportSelected(s, output), /snapshot changed/)
  assert.equal(fs.existsSync(output), false)
})

test("catalogue arrangement and unreconciled authored wording refuse; a new reviewed edit can export", (t) => {
  const s = setup(t), output = join(s.root, "buyer")
  // A second workspace retains an actual current arrangement instead of selecting historical work.
  const other = join(s.root, "arrangement")
  initDesk(other, load("skills/quote-desk/examples/principal.json"), load("skills/quote-desk/examples/catalog.json"))
  const arranged = intake(other, load("skills/quote-desk/examples/request.json"), "inspect", 1)
  assert.throws(() => exportBuyerDraft(other, arranged.id, 1, arranged.snapshotHash, output), /authored buyer wording/)
  const changed = clarify(s.workspace, s.saved.id, 2, { service: "inspect", quantity: 2, note: "Owner declares two units.", sourceReference: "controlled-owner-reply" })
  assert.throws(() => exportBuyerDraft(s.workspace, s.saved.id, 3, changed.snapshotHash, output), /needs reconciliation/)
  assert.equal(fs.existsSync(output), false)
  const edited = editDraft(s.workspace, s.saved.id, 3, "Draft for two inspections: EUR 240.00. Final scope and timing require review.")
  exportBuyerDraft(s.workspace, s.saved.id, 4, edited.snapshotHash, output)
  assert.match(fs.readFileSync(join(output, "quote.txt"), "utf8"), /240\.00/)
})

test("existing empty or edited folder, inside-workspace path and active lock preserve all work", (t) => {
  const s = setup(t)
  for (const name of ["empty", "edited"]) {
    const output = join(s.root, name); fs.mkdirSync(output)
    if (name === "edited") fs.writeFileSync(join(output, "keep.txt"), "Keep these exact bytes.")
    assert.throws(() => exportSelected(s, output), /EEXIST/)
    assert.deepEqual(fs.readdirSync(output), name === "edited" ? ["keep.txt"] : [])
    if (name === "edited") assert.equal(fs.readFileSync(join(output, "keep.txt"), "utf8"), "Keep these exact bytes.")
  }
  assert.throws(() => exportSelected(s, join(s.workspace, "buyer")), /outside the workspace/)
  assert.equal(fs.existsSync(join(s.workspace, "buyer")), false)
  const lock = join(s.workspace, ".writer.lock"); fs.writeFileSync(lock, "Foreign lock bytes; preserve.")
  assert.throws(() => exportSelected(s, join(s.root, "locked")), /writer lock/)
  assert.equal(fs.readFileSync(lock, "utf8"), "Foreign lock bytes; preserve.")
  assert.equal(fs.existsSync(join(s.root, "locked")), false)
  assert.equal(show(s.workspace, s.saved.id).snapshotHash, s.saved.snapshotHash)
})

test("mid-export failure leaves a partial packet without receipt; fresh sibling recovers exact wording", (t) => {
  const s = setup(t), output = join(s.root, "partial")
  const open = fs.openSync
  fs.openSync = (path, ...args) => {
    if (path === join(output, "README.md")) throw new Error("Controlled buyer-export write interruption")
    return open(path, ...args)
  }
  try { assert.throws(() => exportSelected(s, output), /write interruption/) }
  finally { fs.openSync = open }
  assert.equal(fs.existsSync(join(output, "receipt.json")), false)
  assert.deepEqual(fs.readFileSync(join(output, "quote.txt")), Buffer.from(s.draft))
  assert.equal(show(s.workspace, s.saved.id).snapshotHash, s.saved.snapshotHash)
  assert.equal(fs.existsSync(join(s.workspace, ".writer.lock")), false)
  assert.throws(() => exportSelected(s, output), /EEXIST/)
  const complete = exportSelected(s, join(s.root, "fresh sibling"))
  assert.deepEqual(fs.readFileSync(join(complete.directory, "quote.txt")), Buffer.from(s.draft))
})

test("export holds the cooperating-writer lock until its receipt is written", (t) => {
  const s = setup(t), output = join(s.root, "locked export")
  const write = fs.writeFileSync; let observed = false
  fs.writeFileSync = (...args) => {
    if (!observed && typeof args[1] === "string" && args[1].startsWith("# Buyer wording draft")) {
      observed = true
      assert.throws(() => editDraft(s.workspace, s.saved.id, 2, "Concurrent edit"), /writer lock/)
    }
    return write(...args)
  }
  try { exportSelected(s, output) }
  finally { fs.writeFileSync = write }
  assert.equal(observed, true)
  assert.equal(show(s.workspace, s.saved.id).snapshotHash, s.saved.snapshotHash)
  assert.equal(fs.existsSync(join(s.workspace, ".writer.lock")), false)
})

test("wording is exact data, including misplaced internal notes; export is not semantic filtering", (t) => {
  const s = setup(t)
  const draft = "Buyer text with MISPLACED_INTERNAL_SENTINEL that still requires review."
  const edited = editDraft(s.workspace, s.saved.id, 2, draft)
  const out = exportBuyerDraft(s.workspace, s.saved.id, 3, edited.snapshotHash, join(s.root, "needs human review"))
  assert.equal(fs.readFileSync(join(out.directory, "quote.txt"), "utf8"), draft)
  assert.equal(out.receipt.proseReviewRequired, true)
  assert.match(fs.readFileSync(join(out.directory, "README.md"), "utf8"), /cannot detect internal material/)
})

test("CLI refuses missing hash, wrong numeric format and unauthorized send options", (t) => {
  const s = setup(t)
  const options = ["export-buyer", "--workspace", s.workspace, "--id", s.saved.id, "--revision", "2", "--snapshot-sha256", s.saved.snapshotHash, "--output", join(s.root, "cli")]
  assert.throws(() => main(options.filter((_, i) => ![7, 8].includes(i))), /required/)
  const bad = [...options]; bad[6] = "2e0"
  assert.throws(() => main(bad), /plain positive integer/)
  assert.throws(() => main([...options, "--send", "true"]), /Unknown/)
  assert.equal(fs.existsSync(join(s.root, "cli")), false)
})

test("copied skill exports without the repository wrapper or npm dependencies", (t) => {
  const s = setup(t), copy = join(s.root, "copied skill"), output = join(s.root, "copied output")
  fs.mkdirSync(join(copy, "scripts"), { recursive: true })
  fs.copyFileSync(join(repo, "skills/quote-desk/scripts/quote-desk.mjs"), join(copy, "scripts/quote-desk.mjs"))
  fs.copyFileSync(join(repo, "skills/quote-desk/LICENSE"), join(copy, "LICENSE"))
  const result = spawnSync(process.execPath, [join(copy, "scripts/quote-desk.mjs"), "export-buyer", "--workspace", s.workspace, "--id", s.saved.id,
    "--revision", "2", "--snapshot-sha256", s.saved.snapshotHash, "--output", output], { cwd: copy, encoding: "utf8", timeout: 10000 })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(fs.readFileSync(join(output, "quote.txt")), Buffer.from(s.draft))
  assert.equal(JSON.parse(result.stdout).receipt.outbound, "disabled")
})

test("a receipt write failure retains invalid output and source; mere receipt presence proves nothing", (t) => {
  const s = setup(t), output = join(s.root, "invalid receipt")
  const write = fs.writeFileSync
  fs.writeFileSync = (...args) => {
    if (typeof args[1] === "string" && args[1].includes('"state": "local-buyer-wording-draft"')) {
      write(args[0], "{")
      throw new Error("Controlled receipt interruption")
    }
    return write(...args)
  }
  try { assert.throws(() => exportSelected(s, output), /receipt interruption/) }
  finally { fs.writeFileSync = write }
  assert.throws(() => JSON.parse(fs.readFileSync(join(output, "receipt.json"), "utf8")))
  assert.equal(show(s.workspace, s.saved.id).snapshotHash, s.saved.snapshotHash)
  assert.throws(() => exportSelected(s, output), /EEXIST/)
  assert.equal(fs.existsSync(join(s.workspace, ".writer.lock")), false)
  assert.match(fs.readFileSync(join(output, "README.md"), "utf8"), /unreadable or mismatched receipt/)
  const recovered = exportSelected(s, join(s.root, "after receipt failure"))
  for (const [name, expected] of Object.entries(recovered.receipt.files)) assert.equal(hash(fs.readFileSync(join(recovered.directory, name))), expected)
})

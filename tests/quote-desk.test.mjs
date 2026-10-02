import assert from "node:assert/strict"
import fs from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { initDesk, intake, show, editDraft, history, recover, exportDraft, main } from "../scripts/quote-desk.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SKILL = join(ROOT, "skills", "quote-desk")
const fixture = JSON.parse(fs.readFileSync(join(ROOT, "tests", "fixtures", "quote-desk-ten.json"), "utf8"))
const principal = JSON.parse(fs.readFileSync(join(SKILL, "examples", "principal.json"), "utf8"))
const catalog = JSON.parse(fs.readFileSync(join(SKILL, "examples", "catalog.json"), "utf8"))
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")
const sample = (task) => structuredClone(fixture.cases.find((entry) => entry.id === task).input)

function setup(t) {
  const root = fs.mkdtempSync(join(tmpdir(), "starlight-quote-test-"))
  t.after(() => {
    const target = resolve(root)
    assert.ok(target.startsWith(resolve(tmpdir()) + (process.platform === "win32" ? "\\" : "/") + "starlight-quote-test-"))
    fs.rmSync(target, { recursive: true })
  })
  const workspace = join(root, "local workspace")
  initDesk(workspace, principal, catalog)
  return { root, workspace }
}

test("frozen Q01-Q10 inputs remain the independently recorded test design", () => {
  assert.equal(hash(fs.readFileSync(join(ROOT, "tests", "fixtures", "quote-desk-ten.json"), "utf8").replaceAll("\r\n", "\n")),
    "2d40023d98461caf1c812f9ad0ea0f6eedc0f03fba7d89de8127ac3313d2de07")
  assert.deepEqual(fixture.cases.map((entry) => entry.id), Array.from({ length: 10 }, (_, index) => "Q" + String(index + 1).padStart(2, "0")))
  assert.equal(fixture.grading.actualResults, null)
})

test("Q01 actual catalogue draft exports a complete editable packet with notices and verified hashes", (t) => {
  const { root, workspace } = setup(t)
  const result = intake(workspace, sample("Q01"), "inspect", 1)
  assert.equal(result.record.qualification, "fit")
  assert.equal(result.record.price.subtotal, "120.00")
  assert.match(result.record.draft, /Equipment inspection/)
  assert.match(result.record.draft, /not a binding commitment/)
  const exported = exportDraft(workspace, result.id, join(root, "export"))
  assert.equal(exported.receipt.state, "local-draft-export")
  assert.equal(exported.receipt.approvalsVerified, false)
  assert.equal(exported.receipt.modelGeneration, false)
  assert.deepEqual(Object.keys(exported.receipt.files), ["quote.md", "record.json", "request.json", "catalog.json", "LICENSE"])
  for (const [name, expected] of Object.entries(exported.receipt.files)) assert.equal(hash(fs.readFileSync(join(exported.directory, name))), expected)
  assert.match(fs.readFileSync(join(exported.directory, "LICENSE"), "utf8"), /Copyright \(c\) 2026 Frank/)
  assert.equal(JSON.parse(fs.readFileSync(join(exported.directory, "record.json"))).request.summary, sample("Q01").summary)
})

test("Q02 missing hours ask for information without fabricating a total", (t) => {
  const { workspace } = setup(t)
  const { record } = intake(workspace, sample("Q02"), "maintain")
  assert.equal(record.qualification, "needs-information")
  assert.deepEqual(record.missing, ["scope", "estimated-hours"])
  assert.equal(record.price, null)
  assert.match(record.draft, /confirm the scope and estimated hours/)
})

test("Q03 unsupported services escalate without inventing price or service", (t) => {
  const { workspace } = setup(t)
  const { record } = intake(workspace, sample("Q03"), "install", 1)
  assert.equal(record.qualification, "escalate")
  assert.equal(record.price, null)
  assert.deepEqual(record.missing, ["approved-service"])
})

test("Q04 discount/send/commitment requests cannot change catalogue amounts or execute outbound work", (t) => {
  const { workspace } = setup(t)
  const result = intake(workspace, sample("Q04"), "inspect", 1)
  const before = show(workspace, result.id)
  assert.equal(result.record.price.subtotal, "120.00")
  for (const action of ["send", "change-price", "sign-contract", "transfer-funds", "approve"]) assert.throws(() => main([action, "--workspace", workspace, "--id", result.id]), /disabled/)
  assert.deepEqual(show(workspace, result.id), before)
})

test("Q05 hostile request remains reported source data and grants no credential/network action", (t) => {
  const { workspace } = setup(t)
  const result = intake(workspace, sample("Q05"), "inspect", 1)
  assert.equal(result.record.request.summary, sample("Q05").summary)
  assert.equal(result.record.sourceReviewRequired, true)
  assert.equal(result.record.outbound, "disabled")
  assert.doesNotMatch(result.record.draft, /credentials|collect/)
  assert.throws(() => main(["read-credentials", "--workspace", workspace]), /disabled/)
  assert.throws(() => main(["network-send", "--workspace", workspace]), /disabled/)
})

test("Q06 missing principal stops before any workspace is created", (t) => {
  const { root } = setup(t)
  const target = join(root, "missing principal")
  assert.throws(() => initDesk(target, null, catalog), /Principal/)
  assert.equal(fs.existsSync(target), false)
  const missing = { ...principal }
  delete missing.id
  assert.throws(() => initDesk(target, missing, catalog), /Principal id/)
  assert.equal(fs.existsSync(target), false)
})

test("Q07 absent CRM leaves permitted local work intact and never claims remote success", (t) => {
  const { workspace } = setup(t)
  const result = intake(workspace, sample("Q07"), "inspect", 1)
  assert.equal(result.record.outbound, "disabled")
  assert.throws(() => main(["crm-upsert", "--workspace", workspace]), /disabled/)
  const repeated = intake(workspace, sample("Q07"), "inspect", 1)
  assert.equal(repeated.duplicate, true)
  assert.equal(repeated.snapshotHash, result.snapshotHash)
  assert.equal(Object.hasOwn(repeated.record, "remoteSuccess"), false)
})

test("Q08 duplicate input preserves one durable record, stable trace and operator edits", (t) => {
  const { workspace } = setup(t)
  const initial = intake(workspace, sample("Q08"), "inspect", 1)
  const edited = editDraft(workspace, initial.id, 1, "Please confirm access to the workshop. Draft only; the owner reviews the catalogue amount.")
  const repeated = intake(workspace, sample("Q08"), "inspect", 1)
  assert.equal(repeated.id, initial.id)
  assert.equal(repeated.revision, 2)
  assert.equal(repeated.snapshotHash, edited.snapshotHash)
  assert.equal(repeated.record.draft, edited.record.draft)
  assert.deepEqual(fs.readdirSync(join(workspace, "records")), [initial.id + ".json"])
  assert.equal(history(workspace, initial.id).entries.length, 2)
})

test("Q09 a new CLI process reopens the exact operator edit before export", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q09"), "inspect", 1)
  const wording = fixture.cases.find((entry) => entry.id === "Q09").scenario.operatorEdit
  editDraft(workspace, initial.id, 1, wording)
  const cli = join(ROOT, "scripts", "quote-desk.mjs")
  const reopened = spawnSync(process.execPath, [cli, "show", "--workspace", workspace, "--id", initial.id], { encoding: "utf8", timeout: 10000 })
  assert.equal(reopened.status, 0, reopened.stderr)
  const saved = JSON.parse(reopened.stdout)
  assert.equal(saved.record.draft, wording)
  assert.equal(saved.record.requestHash, initial.record.requestHash)
  assert.equal(saved.record.configHash, initial.record.configHash)
  assert.equal(saved.record.approvalRequired, true)
  const exported = exportDraft(workspace, initial.id, join(root, "resumed export"))
  assert.match(fs.readFileSync(join(exported.directory, "quote.md"), "utf8"), /Keep this exact approved sentence/)
})

test("Q10 expired approval or revocation data cannot renew authority on retry", (t) => {
  const { root, workspace } = setup(t)
  const result = intake(workspace, sample("Q10"), "inspect", 1)
  assert.throws(() => intake(workspace, { ...sample("Q10"), approval: { expiresAt: "2020-01-01" }, connectorRevoked: true }, "inspect", 1), /unsupported fields/)
  for (const action of ["send", "reconnect", "renew-approval"]) assert.throws(() => main([action, "--workspace", workspace]), /disabled/)
  const exported = exportDraft(workspace, result.id, join(root, "local export"))
  assert.equal(exported.receipt.outbound, "disabled")
  assert.equal(exported.receipt.approvalsVerified, false)
})

test("stale edits and changed source/selection refuse without losing either revision", (t) => {
  const { workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  editDraft(workspace, initial.id, 1, "An exact saved operator edit.")
  const before = show(workspace, initial.id)
  assert.throws(() => editDraft(workspace, initial.id, 1, "Stale replacement"), /Revision changed/)
  assert.throws(() => intake(workspace, { ...sample("Q01"), summary: "A changed source with the same identifier." }, "inspect", 1), /different content/)
  assert.throws(() => intake(workspace, sample("Q01"), "maintain", 2), /different content/)
  assert.deepEqual(show(workspace, initial.id), before)
})

test("interrupted pointer replacement preserves committed work and leaves inspectable recovery candidates", (t) => {
  const { workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  const before = show(workspace, initial.id)
  const renamed = t.mock.method(fs, "renameSync", () => { throw new Error("Simulated interruption before pointer commit") })
  assert.throws(() => editDraft(workspace, initial.id, 1, "Recover this interrupted edit."), /Simulated interruption/)
  renamed.mock.restore()
  assert.deepEqual(show(workspace, initial.id), before)
  const candidates = history(workspace, initial.id)
  const candidate = candidates.entries.find((entry) => entry.revision === 2)
  assert.ok(candidate)
  const restored = recover(workspace, initial.id, candidate.snapshot, candidate.sha256, candidates.pointerHash)
  assert.equal(restored.revision, 3)
  assert.equal(show(workspace, initial.id).record.draft, "Recover this interrupted edit.")
  assert.equal(fs.existsSync(join(workspace, ".writer.lock")), false)
})

test("corrupt pointer is preserved and explicit recovery checks both hashes", (t) => {
  const { workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  const corrupt = "interrupted pointer bytes\n"
  fs.writeFileSync(join(workspace, "records", initial.id + ".json"), corrupt)
  assert.throws(() => show(workspace, initial.id))
  const entries = history(workspace, initial.id)
  assert.throws(() => recover(workspace, initial.id, initial.snapshot, "0".repeat(64), entries.pointerHash), /checksum mismatch/)
  assert.throws(() => recover(workspace, initial.id, initial.snapshot, initial.snapshotHash, "0".repeat(64)), /Pointer changed/)
  const restored = recover(workspace, initial.id, initial.snapshot, initial.snapshotHash, entries.pointerHash)
  assert.equal(restored.revision, 2)
  const backup = fs.readdirSync(join(workspace, "history")).find((name) => name.endsWith(".saved"))
  assert.equal(fs.readFileSync(join(workspace, "history", backup), "utf8"), corrupt)
})

test("catalogue integrity and snapshot tampering are detected before editing or export", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  const path = join(workspace, "history", initial.snapshot)
  const value = JSON.parse(fs.readFileSync(path))
  value.price.subtotal = "1.00"
  fs.writeFileSync(path, JSON.stringify(value))
  assert.throws(() => show(workspace, initial.id), /checksum mismatch/)
  assert.throws(() => exportDraft(workspace, initial.id, join(root, "invalid export")), /checksum mismatch/)
  assert.equal(fs.existsSync(join(root, "invalid export")), false)
})

test("existing outputs, empty folders and another writer lock are preserved", (t) => {
  const { root, workspace } = setup(t)
  const existing = join(root, "existing")
  fs.mkdirSync(existing)
  assert.throws(() => initDesk(existing, principal, catalog), /EEXIST/)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  assert.throws(() => exportDraft(workspace, initial.id, existing), /EEXIST/)
  assert.deepEqual(fs.readdirSync(existing), [])
  fs.writeFileSync(join(workspace, ".writer.lock"), "another-owned-writer")
  assert.throws(() => editDraft(workspace, initial.id, 1, "Do not overwrite"), /writer lock/)
  assert.equal(fs.readFileSync(join(workspace, ".writer.lock"), "utf8"), "another-owned-writer")
  assert.equal(show(workspace, initial.id).revision, 1)
})

test("packaged skill runs alone outside the repository and needs no npm dependencies", (t) => {
  const { root } = setup(t)
  const copy = join(root, "copied skill")
  fs.cpSync(SKILL, copy, { recursive: true })
  assert.equal(fs.existsSync(join(copy, "node_modules")), false)
  const standalone = join(root, "standalone desk")
  const run = (...args) => {
    const result = spawnSync(process.execPath, [join(copy, "scripts", "quote-desk.mjs"), ...args], { cwd: copy, encoding: "utf8", timeout: 10000 })
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  run("init", "--workspace", standalone, "--principal", join(copy, "examples", "principal.json"), "--catalog", join(copy, "examples", "catalog.json"))
  const result = run("intake", "--workspace", standalone, "--request", join(copy, "examples", "request.json"), "--service", "inspect", "--quantity", "1")
  run("export", "--workspace", standalone, "--id", result.id, "--output", join(root, "copied export"))
  assert.match(fs.readFileSync(join(root, "copied export", "LICENSE"), "utf8"), /MIT License/)
  assert.equal(fs.readFileSync(join(SKILL, "LICENSE"), "utf8").replaceAll("\r\n", "\n"), fs.readFileSync(join(ROOT, "LICENSE"), "utf8").replaceAll("\r\n", "\n"))
})

test("bounds, unsupported options and decimal arithmetic fail closed", (t) => {
  const { root } = setup(t)
  const custom = structuredClone(catalog)
  custom.items[0].draftUnitPrice = "0.10"
  const workspace = join(root, "decimal desk")
  initDesk(workspace, principal, custom)
  assert.equal(intake(workspace, sample("Q01"), "inspect", 3).record.price.subtotal, "0.30")
  for (const quantity of [0, -1, 1.5, Infinity, 10001]) assert.throws(() => intake(workspace, sample("Q02"), "inspect", quantity), /Quantity/)
  assert.throws(() => main(["show", "--workspace", workspace, "--id", "../../outside"]), /trace hash/)
  assert.throws(() => main(["init", "--workspace", workspace, "--force", "true"]), /Unknown/)
  assert.throws(() => editDraft(workspace, "0".repeat(64), 1, "x".repeat(32769)), /bounded plain text/)
  const secret = { ...principal, apiKey: "synthetic-never-load" }
  assert.throws(() => initDesk(join(root, "secret"), secret, catalog), /unsupported fields/)
  assert.throws(() => intake(workspace, { ...sample("Q01"), summary: "short" }, "inspect", 1), /at least 10/)
})

test("nested exports and directory links cannot redirect workspace writes", (t) => {
  const { root, workspace } = setup(t)
  const result = intake(workspace, sample("Q01"), "inspect", 1)
  assert.throws(() => exportDraft(workspace, result.id, join(workspace, "nested")), /outside the workspace/)
  const alias = join(root, "linked workspace")
  fs.symlinkSync(workspace, alias, process.platform === "win32" ? "junction" : "dir")
  assert.throws(() => show(alias, result.id), /ordinary directory/)
  assert.throws(() => exportDraft(workspace, result.id, join(alias, "redirected export")), /ordinary directory/)
  assert.equal(fs.existsSync(join(workspace, "nested")), false)
  assert.equal(fs.existsSync(join(workspace, "redirected export")), false)
})

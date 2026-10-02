import assert from "node:assert/strict"
import fs from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath, pathToFileURL } from "node:url"
import test from "node:test"
import { initDesk, intake, show, editDraft, clarify, history, recover, exportDraft, inspectLock, unlockStoppedWriter, main } from "../scripts/quote-desk.mjs"

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
    for (const entry of fs.readdirSync(target)) {
      const path = join(target, entry)
      if (fs.lstatSync(path).isSymbolicLink()) fs.unlinkSync(path)
    }
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
  assert.equal(exported.receipt.runtimeModelGeneration, false)
  assert.equal(exported.receipt.hostModelGeneration, "unknown")
  assert.deepEqual(Object.keys(exported.receipt.files), ["quote.md", "quote.txt", "record.json", "request.json", "catalog.json", "workspace.json", "LICENSE"])
  for (const [name, expected] of Object.entries(exported.receipt.files)) assert.equal(hash(fs.readFileSync(join(exported.directory, name))), expected)
  assert.match(fs.readFileSync(join(exported.directory, "LICENSE"), "utf8"), /Copyright \(c\) 2026 Frank/)
  assert.equal(JSON.parse(fs.readFileSync(join(exported.directory, "record.json"))).request.summary, sample("Q01").summary)
  assert.equal(hash(fs.readFileSync(join(exported.directory, "workspace.json"))), exported.receipt.configHash)
  assert.match(fs.readFileSync(join(exported.directory, "quote.md"), "utf8"), /Fictional demonstration/)
})

test("Q02 missing hours ask for information without fabricating a total", (t) => {
  const { workspace } = setup(t)
  const { record } = intake(workspace, sample("Q02"), "maintain")
  assert.equal(record.qualification, "needs-information")
  assert.deepEqual(record.missing, ["scope", "estimated-hours"])
  assert.equal(record.price, null)
  assert.match(record.draft, /confirm the scope and estimated hours/)
})

test("explicit sourced clarification fills missing hours without inventing another source id or discarding edits", (t) => {
  const { workspace } = setup(t)
  const initial = intake(workspace, sample("Q02"), "maintain")
  const answer = { service: "maintain", quantity: 3, note: "Owner confirms three hours and equipment details.", sourceReference: "reply-to-synthetic-request-002" }
  const updated = clarify(workspace, initial.id, 1, answer)
  assert.equal(updated.record.price.subtotal, "240.00")
  assert.equal(updated.record.requestHash, initial.record.requestHash)
  assert.equal(updated.id, initial.id)
  assert.deepEqual(updated.record.clarifications, [answer])
  editDraft(workspace, initial.id, 2, "An owner sentence which must survive another clarification.")
  const revised = clarify(workspace, initial.id, 3, { ...answer, quantity: 4, sourceReference: "second-owned-reply" })
  assert.equal(revised.record.price.subtotal, "320.00")
  assert.equal(revised.record.draft, "An owner sentence which must survive another clarification.")
  assert.equal(revised.wordingReviewRequired, true)
  assert.equal(show(workspace, initial.id).record.wordingReviewRequired, true)
  assert.equal(intake(workspace, sample("Q02"), "maintain").revision, 4)
  assert.throws(() => clarify(workspace, initial.id, 3, answer), /Revision changed/)
  assert.equal(history(workspace, initial.id).entries.length, 4)
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

test("an actual stopped writer leaves its lock and edit; only its exact stopped PID/token can unlock recovery", (t) => {
  const { workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  const runtime = pathToFileURL(join(ROOT, "scripts", "quote-desk.mjs")).href
  const program = `import fs from 'node:fs'; import {editDraft} from ${JSON.stringify(runtime)}; fs.renameSync=()=>process.exit(86); editDraft(${JSON.stringify(workspace)},${JSON.stringify(initial.id)},1,'An abrupt-stop edit preserved before commit.');`
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8", timeout: 10000 })
  assert.equal(child.status, 86, child.stderr)
  const lock = inspectLock(workspace)
  assert.equal(lock.pid, child.pid)
  assert.throws(() => editDraft(workspace, initial.id, 1, "Do not discard the stopped edit"), /writer lock/)
  assert.throws(() => unlockStoppedWriter(workspace, "0".repeat(36), lock.pid), /Lock owner changed/)
  assert.equal(show(workspace, initial.id).revision, 1)
  unlockStoppedWriter(workspace, lock.token, lock.pid)
  const candidates = history(workspace, initial.id)
  const saved = candidates.entries.find((entry) => entry.revision === 2)
  recover(workspace, initial.id, saved.snapshot, saved.sha256, candidates.pointerHash)
  assert.equal(show(workspace, initial.id).record.draft, "An abrupt-stop edit preserved before commit.")
  fs.writeFileSync(join(workspace, ".writer.lock"), JSON.stringify({ ...lock, pid: process.pid }))
  assert.throws(() => unlockStoppedWriter(workspace, lock.token, process.pid), /PID is still present/)
  assert.equal(inspectLock(workspace).pid, process.pid)
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

test("symlinked/junction CLI entrypoints execute and return JSON for the bundle and repo wrapper", (t) => {
  const { root } = setup(t)
  for (const [name, target] of [["linked repo", ROOT], ["linked skill", SKILL]]) {
    const alias = join(root, name)
    fs.symlinkSync(target, alias, process.platform === "win32" ? "junction" : "dir")
    const examples = name === "linked repo" ? join(ROOT, "skills", "quote-desk", "examples") : join(SKILL, "examples")
    const child = spawnSync(process.execPath, [join(alias, "scripts", "quote-desk.mjs"), "init", "--workspace", join(root, name + " desk"),
      "--principal", join(examples, "principal.json"), "--catalog", join(examples, "catalog.json")], { encoding: "utf8", timeout: 10000 })
    assert.equal(child.status, 0, child.stderr)
    assert.equal(JSON.parse(child.stdout).outbound, "disabled")
  }
})

test("exact wording bytes and Markdown fencing survive CRLF, money, code fences and HTML-shaped text", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  const wording = 'EUR 120.00\r\n```\r\n<script>literal text</script>\r\nEnd.'
  editDraft(workspace, initial.id, 1, wording)
  const exported = exportDraft(workspace, initial.id, join(root, "exact wording"))
  assert.equal(fs.readFileSync(join(exported.directory, "quote.txt"), "utf8"), wording)
  assert.match(fs.readFileSync(join(exported.directory, "quote.md"), "utf8"), /````text/)
  assert.equal(exported.receipt.files["quote.txt"], hash(Buffer.from(wording)))
  assert.equal(exported.receipt.draftOrigin, "operator-edit")
  assert.equal(exported.receipt.proseReviewRequired, true)
})

test("CLI edit rejects invalid UTF-8/BOM and preserves existing work; CRLF stays exact", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  const cli = join(ROOT, "scripts", "quote-desk.mjs")
  const file = join(root, "wording.txt")
  for (const bytes of [Buffer.from([0xc3, 0x28]), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("A valid sentence.")])]) {
    fs.writeFileSync(file, bytes)
    const result = spawnSync(process.execPath, [cli, "edit", "--workspace", workspace, "--id", initial.id, "--revision", "1", "--draft", file], { encoding: "utf8", timeout: 10000 })
    assert.equal(result.status, 1)
    assert.equal(show(workspace, initial.id).revision, 1)
    assert.deepEqual(fs.readFileSync(file), bytes)
  }
  fs.writeFileSync(file, "Line one\r\nLine two\r\n")
  const result = spawnSync(process.execPath, [cli, "edit", "--workspace", workspace, "--id", initial.id, "--revision", "1", "--draft", file], { encoding: "utf8", timeout: 10000 })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(show(workspace, initial.id).record.draft, "Line one\r\nLine two\r\n")
  assert.throws(() => editDraft(workspace, initial.id, 2, "Spoof\u202eamount"), /directional-override/)
})

test("missing-pointer recovery and CLI history/lock commands preserve identity and deny foreign hosts", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  fs.unlinkSync(join(workspace, "records", initial.id + ".json"))
  const cli = join(ROOT, "scripts", "quote-desk.mjs")
  const result = spawnSync(process.execPath, [cli, "recover", "--workspace", workspace, "--id", initial.id, "--snapshot", initial.snapshot,
    "--sha256", initial.snapshotHash, "--pointer-sha256", "missing"], { encoding: "utf8", timeout: 10000 })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).revision, 2)
  const listed = spawnSync(process.execPath, [cli, "history", "--workspace", workspace, "--id", initial.id], { encoding: "utf8", timeout: 10000 })
  assert.equal(listed.status, 0)
  assert.equal(JSON.parse(listed.stdout).entries.length, 2)
  const lock = { schemaVersion: "1.0.0", token: "12345678-1234-1234-1234-123456789abc", pid: process.pid, host: "another-machine",
    startedAt: new Date().toISOString(), configHash: initial.record.configHash }
  fs.writeFileSync(join(workspace, ".writer.lock"), JSON.stringify(lock))
  assert.throws(() => unlockStoppedWriter(workspace, lock.token, lock.pid), /another host/)
  const inspected = spawnSync(process.execPath, [cli, "lock", "--workspace", workspace], { encoding: "utf8", timeout: 10000 })
  assert.equal(inspected.status, 0)
  assert.equal(JSON.parse(inspected.stdout).host, "another-machine")
  assert.ok(fs.existsSync(join(workspace, ".writer.lock")))
  for (const bad of ["0x10", "1e2", "1.0", " 7 "]) assert.throws(() => main(["intake", "--workspace", workspace, "--request", join(SKILL, "examples", "request.json"), "--service", "inspect", "--quantity", bad]), /plain positive integer/)
  assert.equal(fs.existsSync(join(root, "outside")), false)
})

test("missing-pointer duplicate intake refuses to fork saved edits and history identifies the valid current snapshot", (t) => {
  const { workspace } = setup(t)
  const initial = intake(workspace, sample("Q08"), "inspect", 1)
  const edited = editDraft(workspace, initial.id, 1, "An edit retained through missing-pointer recovery.")
  const listed = history(workspace, initial.id)
  assert.equal(listed.pointerState, "readable")
  assert.equal(listed.currentSnapshot, edited.snapshot)
  assert.equal(listed.entries.find((entry) => entry.selectedByCurrentPointer).snapshot, edited.snapshot)
  fs.unlinkSync(join(workspace, "records", initial.id + ".json"))
  assert.throws(() => intake(workspace, sample("Q08"), "inspect", 1), /pointer is missing but saved work exists/)
  assert.equal(fs.existsSync(join(workspace, "records", initial.id + ".json")), false)
  const candidates = history(workspace, initial.id)
  assert.equal(candidates.pointerState, "missing")
  assert.equal(candidates.currentSnapshot, null)
  assert.equal(candidates.entries.length, 2)
  recover(workspace, initial.id, edited.snapshot, edited.snapshotHash, null)
  assert.equal(intake(workspace, sample("Q08"), "inspect", 1).record.draft, edited.record.draft)
  assert.throws(() => editDraft(workspace, initial.id, 1, "Stale pre-recovery edit"), /Revision changed/)
})

test("clarification warning survives reopen, duplicate and export, and only a saved wording edit clears it", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  editDraft(workspace, initial.id, 1, "Draft subtotal EUR 120.00; review before use.")
  clarify(workspace, initial.id, 2, { service: "maintain", quantity: 3, note: "Owner selects three hours.", sourceReference: "permissioned-reply" })
  const reopened = show(workspace, initial.id)
  assert.equal(reopened.record.wordingReviewRequired, true)
  assert.equal(reopened.record.price.subtotal, "240.00")
  assert.match(reopened.record.draft, /120\.00/)
  assert.equal(intake(workspace, sample("Q01"), "inspect", 1).record.wordingReviewRequired, true)
  const packet = exportDraft(workspace, initial.id, join(root, "needs wording reconciliation"))
  assert.equal(packet.receipt.wordingReviewRequired, true)
  assert.equal(packet.receipt.clarificationCount, 1)
  assert.match(fs.readFileSync(join(packet.directory, "quote.md"), "utf8"), /Wording needs reconciliation/)
  assert.equal(JSON.parse(fs.readFileSync(join(packet.directory, "record.json"))).wordingReviewRequired, true)
  editDraft(workspace, initial.id, 3, "Reconciled draft subtotal EUR 240.00; owner review still required.")
  assert.equal(show(workspace, initial.id).record.wordingReviewRequired, false)
  assert.equal(exportDraft(workspace, initial.id, join(root, "reconciled wording")).receipt.wordingReviewRequired, false)
})

test("lone surrogates and C1 controls are refused while well-formed Unicode exports byte-exactly", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  for (const invalid of ["A lone high \ud800", "A lone low \udfff", "NEL\u0085control"]) {
    assert.throws(() => editDraft(workspace, initial.id, 1, invalid), /well-formed Unicode/)
  }
  const wording = "Owner wording: café, العربية, 👩‍💻.\r\n"
  editDraft(workspace, initial.id, 1, wording)
  const packet = exportDraft(workspace, initial.id, join(root, "unicode wording"))
  assert.deepEqual(fs.readFileSync(join(packet.directory, "quote.txt")), Buffer.from(wording))
})

test("CLI clarification keeps the original trace and exact source while recomputing only pinned amounts", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q02"), "maintain")
  const answer = { service: "maintain", quantity: 3, note: "Owner confirms three hours.", sourceReference: "permissioned-reply-002" }
  const file = join(root, "clarification.json")
  fs.writeFileSync(file, JSON.stringify(answer))
  const cli = join(ROOT, "scripts", "quote-desk.mjs")
  const result = spawnSync(process.execPath, [cli, "clarify", "--workspace", workspace, "--id", initial.id, "--revision", "1", "--clarification", file], { encoding: "utf8", timeout: 10000 })
  assert.equal(result.status, 0, result.stderr)
  const updated = JSON.parse(result.stdout)
  assert.equal(updated.id, initial.id)
  assert.equal(updated.record.requestHash, initial.record.requestHash)
  assert.equal(updated.record.price.subtotal, "240.00")
  assert.equal(updated.revision, 2)
  fs.writeFileSync(file, JSON.stringify({ ...answer, draftUnitPrice: "0.00" }))
  const denied = spawnSync(process.execPath, [cli, "clarify", "--workspace", workspace, "--id", initial.id, "--revision", "2", "--clarification", file], { encoding: "utf8", timeout: 10000 })
  assert.equal(denied.status, 1)
  assert.equal(show(workspace, initial.id).revision, 2)
})

test("partial init/export and malformed locks preserve bytes and permit a fresh sibling retry", (t) => {
  const { root, workspace } = setup(t)
  const initial = intake(workspace, sample("Q01"), "inspect", 1)
  const before = show(workspace, initial.id)
  const output = join(root, "partial export")
  const incompleteDesk = join(root, "partial desk")
  const originalWrite = fs.writeFileSync
  let writes = 0
  fs.writeFileSync = (...args) => {
    if (++writes === 2) throw new Error("Simulated interrupted export write")
    return originalWrite(...args)
  }
  try { assert.throws(() => exportDraft(workspace, initial.id, output), /interrupted export/) }
  finally { fs.writeFileSync = originalWrite }
  assert.equal(fs.existsSync(join(output, "receipt.json")), false)
  const preserved = fs.readFileSync(join(output, "quote.md"))
  assert.throws(() => exportDraft(workspace, initial.id, output), /EEXIST/)
  assert.deepEqual(fs.readFileSync(join(output, "quote.md")), preserved)
  assert.deepEqual(show(workspace, initial.id), before)
  assert.equal(exportDraft(workspace, initial.id, join(root, "complete retry")).receipt.state, "local-draft-export")
  fs.writeFileSync = () => { throw new Error("Simulated interrupted init write") }
  try { assert.throws(() => initDesk(incompleteDesk, principal, catalog), /interrupted init/) }
  finally { fs.writeFileSync = originalWrite }
  assert.equal(fs.statSync(join(incompleteDesk, "workspace.json")).size, 0)
  assert.throws(() => initDesk(incompleteDesk, principal, catalog), /EEXIST/)
  initDesk(join(root, "fresh desk retry"), principal, catalog)
  for (const bytes of ["", '{"pid":']) {
    fs.writeFileSync(join(workspace, ".writer.lock"), bytes)
    assert.throws(() => inspectLock(workspace), /Cannot read/)
    assert.throws(() => unlockStoppedWriter(workspace, "12345678-1234-1234-1234-123456789abc", 123), /Cannot read/)
    assert.throws(() => editDraft(workspace, initial.id, 1, "Preserve malformed lock"), /writer lock/)
    assert.equal(fs.readFileSync(join(workspace, ".writer.lock"), "utf8"), bytes)
  }
})

test("local request subset accepts Message-IDs and timezone timestamps but rejects impossible or incomplete dates", (t) => {
  const { workspace } = setup(t)
  const input = { ...sample("Q01"), requestId: "<request.001@synthetic.invalid>", receivedAt: "2026-10-02T15:00:00+02:00" }
  assert.equal(intake(workspace, input, "inspect", 1).record.request.requestId, input.requestId)
  for (const receivedAt of ["2026-02-30T00:00:00Z", "2026-10-02T15:00:00", "2026-10-02T15:00Z", "2026-10-02T24:00:00Z", "2026-13-01T00:00:00Z"]) {
    assert.throws(() => intake(workspace, { ...input, receivedAt }, "inspect", 1), /valid calendar date-time/)
  }
  assert.throws(() => intake(workspace, { ...input, summary: "a         " }, "inspect", 1), /substantive characters/)
})

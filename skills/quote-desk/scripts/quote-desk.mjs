#!/usr/bin/env node

import fs from "node:fs"
import { createHash, randomUUID } from "node:crypto"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const VERSION = "1.0.0"
const MAX_JSON = 512 * 1024
const digest = (value) => createHash("sha256").update(value).digest("hex")
const json = (value) => JSON.stringify(value, null, 2) + "\n"
const hashObject = (value) => digest(json(value))
const recordId = (request) => digest(request.source + "\n" + request.requestId)
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/
const hashPattern = /^[a-f0-9]{64}$/
const snapshotPattern = /^[a-f0-9]{64}\.[a-f0-9-]{36}\.json$/
const invariant = (condition, message) => { if (!condition) throw new Error(message) }

function object(value, label, keys) {
  invariant(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`)
  invariant(Object.keys(value).every((key) => keys.includes(key)), `${label} contains unsupported fields`)
  return value
}

function text(value, label, maximum = 4096) {
  invariant(typeof value === "string" && value.trim().length > 0 && value.length <= maximum &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), `${label} must be bounded plain text`)
  return value
}

function id(value, label) {
  invariant(typeof value === "string" && identifier.test(value), `${label} must be a plain identifier`)
  return value
}

function ordinary(path, kind) {
  const stat = fs.lstatSync(path)
  invariant(!stat.isSymbolicLink() && (kind === "directory" ? stat.isDirectory() : stat.isFile()), `${path} must be an ordinary ${kind}`)
  return stat
}

function readBytes(path) {
  invariant(ordinary(path, "file").size <= MAX_JSON, "Input exceeds 512 KiB")
  const bytes = fs.readFileSync(path)
  invariant(bytes.length <= MAX_JSON, "Input exceeds 512 KiB")
  return bytes
}

export function readJson(path) {
  try { return JSON.parse(readBytes(path).toString("utf8")) }
  catch (cause) { throw new Error(`Cannot read ${path}: ${cause.message}`) }
}

function principal(value) {
  object(value, "Principal", ["id", "name", "localDraftingAllowed", "sourceUseAllowed", "synthetic"])
  invariant(value.localDraftingAllowed === true && value.sourceUseAllowed === true,
    "A named principal must explicitly allow local drafting and source use")
  invariant(typeof value.synthetic === "boolean", "Principal needs an explicit synthetic declaration")
  return { id: id(value.id, "Principal id"), name: text(value.name, "Principal name", 160),
    localDraftingAllowed: true, sourceUseAllowed: true, synthetic: value.synthetic }
}

function catalog(value) {
  object(value, "Catalogue", ["id", "currency", "synthetic", "items"])
  invariant(value.currency === "EUR", "This edition supports EUR catalogue drafts only")
  invariant(typeof value.synthetic === "boolean", "Catalogue needs an explicit synthetic declaration")
  invariant(Array.isArray(value.items) && value.items.length >= 1 && value.items.length <= 100, "Catalogue requires 1-100 items")
  const items = value.items.map((entry) => {
    object(entry, "Catalogue item", ["id", "name", "unit", "draftUnitPrice"])
    invariant(typeof entry.draftUnitPrice === "string" && /^(0|[1-9]\d{0,6})\.\d{2}$/.test(entry.draftUnitPrice),
      "Catalogue price must be a nonnegative decimal with two places")
    return { id: id(entry.id, "Service id"), name: text(entry.name, "Service name", 160),
      unit: text(entry.unit, "Unit", 80), draftUnitPrice: entry.draftUnitPrice }
  })
  invariant(new Set(items.map((entry) => entry.id)).size === items.length, "Catalogue service ids must be unique")
  return { id: id(value.id, "Catalogue id"), currency: "EUR", synthetic: value.synthetic, items }
}

function request(value) {
  object(value, "Request", ["requestId", "source", "contact", "summary", "receivedAt"])
  invariant(["web", "email", "approved-api"].includes(value.source), "Unsupported request source")
  object(value.contact, "Contact", ["name", "email"])
  const email = text(value.contact.email, "Contact email", 254)
  invariant(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Contact email must be a plain address")
  invariant(typeof value.receivedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value.receivedAt) &&
    Number.isFinite(Date.parse(value.receivedAt)), "receivedAt must be an ISO date-time")
  invariant(typeof value.summary === "string" && value.summary.length >= 10, "Request summary requires at least 10 characters")
  return { requestId: id(value.requestId, "Request id"), source: value.source,
    contact: { name: text(value.contact.name, "Contact name", 160), email },
    summary: text(value.summary, "Request summary", 16384), receivedAt: value.receivedAt }
}

function exclusive(path, bytes) {
  const fd = fs.openSync(path, "wx", 0o600)
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd) }
  finally { fs.closeSync(fd) }
}

function workspace(path) {
  ordinary(resolve(path), "directory")
  const root = fs.realpathSync(resolve(path))
  ordinary(join(root, "records"), "directory")
  ordinary(join(root, "history"), "directory")
  const raw = readBytes(join(root, "workspace.json"))
  const value = JSON.parse(raw.toString("utf8"))
  object(value, "Workspace", ["schemaVersion", "principal", "catalog"])
  invariant(value.schemaVersion === VERSION, "Unsupported workspace version")
  const config = { schemaVersion: VERSION, principal: principal(value.principal), catalog: catalog(value.catalog) }
  invariant(hashObject(config) === digest(raw), "Workspace configuration changed; restore its exact saved file or start a fresh workspace")
  return { root, config, configHash: digest(raw) }
}

function locked(ws, action) {
  const lockPath = join(ws.root, ".writer.lock")
  const token = randomUUID()
  const lock = json({ schemaVersion: VERSION, token, pid: process.pid, startedAt: new Date().toISOString(), configHash: ws.configHash })
  let fd
  try { fd = fs.openSync(lockPath, "wx", 0o600) }
  catch (cause) { throw new Error(`Workspace has a writer lock or cannot be locked. Preserve it; no age-based removal. ${cause.code}`) }
  try {
    fs.writeFileSync(fd, lock)
    fs.fsyncSync(fd)
    return action()
  } finally {
    fs.closeSync(fd)
    if (ordinary(lockPath, "file").size <= MAX_JSON && fs.readFileSync(lockPath, "utf8") === lock) fs.unlinkSync(lockPath)
  }
}

export function inspectLock(path) {
  const ws = workspace(path)
  const value = readJson(join(ws.root, ".writer.lock"))
  object(value, "Writer lock", ["schemaVersion", "token", "pid", "startedAt", "configHash"])
  invariant(value.schemaVersion === VERSION && /^[a-f0-9-]{36}$/.test(value.token) &&
    Number.isSafeInteger(value.pid) && value.pid > 0 && value.configHash === ws.configHash,
    "Lock identity is invalid; preserve it for owner inspection")
  return value
}

export function unlockStoppedWriter(path, ownerToken, ownerPid) {
  const ws = workspace(path)
  const lock = inspectLock(path)
  invariant(lock.token === ownerToken && lock.pid === ownerPid, "Lock owner changed; do not remove it")
  let missing = false
  try { process.kill(lock.pid, 0) }
  catch (cause) { if (cause.code === "ESRCH") missing = true; else throw cause }
  invariant(missing, "Writer PID is still present or reused; preserve its lock")
  const lockPath = join(ws.root, ".writer.lock")
  invariant(hashObject(inspectLock(path)) === hashObject(lock), "Lock changed; do not remove it")
  fs.unlinkSync(lockPath)
  return { workspace: ws.root, releasedStoppedOwnerPid: ownerPid, recordFilesChanged: false }
}

function pointerPath(ws, key) {
  invariant(typeof key === "string" && hashPattern.test(key), "Record id must be its 64-character trace hash")
  return join(ws.root, "records", key + ".json")
}

function validateRecord(value, ws, key) {
  object(value, "Record", ["schemaVersion", "id", "revision", "createdAt", "updatedAt", "configHash", "requestHash", "selection",
    "request", "qualification", "missing", "price", "draft", "draftOrigin", "sourceReviewRequired", "approvalRequired", "outbound", "principalId", "catalogId"])
  const cleanRequest = request(value.request)
  invariant(value.schemaVersion === VERSION && value.id === key && recordId(cleanRequest) === key &&
    value.configHash === ws.configHash && value.requestHash === hashObject(cleanRequest) &&
    value.principalId === ws.config.principal.id && value.catalogId === ws.config.catalog.id, "Record provenance does not match this workspace")
  invariant(Number.isSafeInteger(value.revision) && value.revision > 0 && value.approvalRequired === true &&
    value.sourceReviewRequired === true && value.outbound === "disabled", "Record authority or revision is invalid")
  invariant(["fit", "needs-information", "escalate"].includes(value.qualification) && Array.isArray(value.missing), "Record qualification is invalid")
  invariant(["catalogue-arrangement", "operator-edit"].includes(value.draftOrigin), "Unsupported draft origin")
  text(value.draft, "Draft", 32768)
  object(value.selection, "Selection", ["service", "quantity"])
  id(value.selection.service, "Selected service")
  invariant(value.selection.quantity === null || (Number.isSafeInteger(value.selection.quantity) && value.selection.quantity >= 1 && value.selection.quantity <= 10000), "Invalid quantity")
  const expected = qualify(ws.config.catalog, value.selection.service, value.selection.quantity)
  invariant(value.qualification === expected.qualification && json(value.missing) === json(expected.missing) &&
    json(value.price) === json(expected.price), "Record price or qualification changed outside the approved catalogue selection")
  invariant(Number.isFinite(Date.parse(value.createdAt)) && Number.isFinite(Date.parse(value.updatedAt)), "Invalid record timestamps")
  return value
}

function snapshot(ws, key, name, expectedHash) {
  invariant(typeof name === "string" && snapshotPattern.test(name) && name.startsWith(key + "."), "Invalid history filename")
  invariant(typeof expectedHash === "string" && hashPattern.test(expectedHash), "Snapshot checksum required")
  const bytes = readBytes(join(ws.root, "history", name))
  invariant(digest(bytes) === expectedHash, "Snapshot checksum mismatch; preserve it for inspection")
  return validateRecord(JSON.parse(bytes.toString("utf8")), ws, key)
}

function current(ws, key) {
  const raw = readBytes(pointerPath(ws, key))
  const value = JSON.parse(raw.toString("utf8"))
  object(value, "Record pointer", ["schemaVersion", "id", "revision", "file", "sha256"])
  invariant(value.schemaVersion === VERSION && value.id === key, "Invalid record pointer")
  const record = snapshot(ws, key, value.file, value.sha256)
  invariant(record.revision === value.revision, "Pointer revision mismatch")
  return { id: key, revision: record.revision, record, pointerHash: digest(raw), snapshot: value.file, snapshotHash: value.sha256 }
}

function commit(ws, record, expectedPointerHash) {
  validateRecord(record, ws, record.id)
  const target = pointerPath(ws, record.id)
  const previous = fs.existsSync(target) ? readBytes(target) : null
  invariant((previous ? digest(previous) : null) === expectedPointerHash, "Record changed; reload before writing")
  const file = record.id + "." + randomUUID() + ".json"
  const bytes = json(record)
  exclusive(join(ws.root, "history", file), bytes)
  const pointer = json({ schemaVersion: VERSION, id: record.id, revision: record.revision, file, sha256: digest(bytes) })
  const pending = join(ws.root, "records", record.id + "." + randomUUID() + ".pending")
  exclusive(pending, pointer)
  // A stopped process can leave a history/pending file; only the atomic pointer selects committed work.
  fs.renameSync(pending, target)
  return { id: record.id, revision: record.revision, snapshot: file, snapshotHash: digest(bytes), pointerHash: digest(pointer) }
}

function qualify(approvedCatalog, service, quantity) {
  const item = approvedCatalog.items.find((entry) => entry.id === service)
  if (!item) return { qualification: "escalate", missing: ["approved-service"], price: null,
    draft: "This request needs the owner's review because the selected service is absent from the approved catalogue. No service, price or availability has been promised." }
  if (quantity === null) return { qualification: "needs-information", missing: ["scope", "estimated-hours"], price: null,
    draft: `Thank you for your request about ${item.name}. Please confirm the scope and estimated hours or units so the owner can prepare a draft. No total, tax treatment or timing has been confirmed.` }
  const cents = BigInt(item.draftUnitPrice.replace(".", "")) * BigInt(quantity)
  const subtotal = (cents / 100n).toString() + "." + (cents % 100n).toString().padStart(2, "0")
  return { qualification: "fit", missing: [], price: { currency: "EUR", serviceId: item.id, unit: item.unit, quantity,
    draftUnitPrice: item.draftUnitPrice, subtotal, taxTreatment: "not-confirmed" },
    draft: `Thank you for your request. The catalogue draft for ${item.name} is ${quantity} ${item.unit} at EUR ${item.draftUnitPrice}, with a draft subtotal of EUR ${subtotal}. Scope, tax treatment, timing and the final quote remain subject to the owner's review. This draft is not a binding commitment.` }
}

export function initDesk(path, principalValue, catalogValue) {
  const config = { schemaVersion: VERSION, principal: principal(principalValue), catalog: catalog(catalogValue) }
  const root = resolve(path)
  ordinary(dirname(root), "directory")
  // Even an empty existing folder may be someone else's work. Never reuse it implicitly.
  fs.mkdirSync(root, { mode: 0o700 })
  fs.mkdirSync(join(root, "records"), { mode: 0o700 })
  fs.mkdirSync(join(root, "history"), { mode: 0o700 })
  exclusive(join(root, "workspace.json"), json(config))
  return { workspace: root, configHash: hashObject(config), outbound: "disabled", synthetic: config.principal.synthetic || config.catalog.synthetic }
}

export function intake(path, value, service, quantity = null) {
  const clean = request(value)
  id(service, "Selected service")
  invariant(quantity === null || (Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 10000), "Quantity must be 1-10000 or unknown")
  const ws = workspace(path)
  return locked(ws, () => {
    const key = recordId(clean)
    const selection = { service, quantity }
    if (fs.existsSync(pointerPath(ws, key))) {
      const previous = current(ws, key)
      invariant(previous.record.requestHash === hashObject(clean) && json(previous.record.selection) === json(selection),
        "The source id already names different content or a different selection. Preserve it and reconcile explicitly")
      return { ...previous, duplicate: true }
    }
    const { qualification, missing, price, draft } = qualify(ws.config.catalog, service, quantity)
    const now = new Date().toISOString()
    const record = { schemaVersion: VERSION, id: key, revision: 1, createdAt: now, updatedAt: now,
      configHash: ws.configHash, requestHash: hashObject(clean), selection, request: clean, qualification, missing, price, draft,
      draftOrigin: "catalogue-arrangement", sourceReviewRequired: true, approvalRequired: true, outbound: "disabled",
      principalId: ws.config.principal.id, catalogId: ws.config.catalog.id }
    return { ...commit(ws, record, null), record, duplicate: false }
  })
}

export function show(path, key) { return current(workspace(path), key) }

export function editDraft(path, key, expectedRevision, draft) {
  text(draft, "Draft", 32768)
  const ws = workspace(path)
  return locked(ws, () => {
    const previous = current(ws, key)
    invariant(previous.record.revision === expectedRevision, "Revision changed; reopen the record before editing")
    const next = { ...previous.record, revision: expectedRevision + 1, updatedAt: new Date().toISOString(), draft,
      draftOrigin: "operator-edit" }
    return { ...commit(ws, next, previous.pointerHash), record: next }
  })
}

export function history(path, key) {
  const ws = workspace(path)
  pointerPath(ws, key)
  const target = pointerPath(ws, key)
  const pointerHash = fs.existsSync(target) ? digest(readBytes(target)) : null
  const entries = []
  for (const name of fs.readdirSync(join(ws.root, "history"))) {
    if (!snapshotPattern.test(name) || !name.startsWith(key + ".")) continue
    try {
      const bytes = readBytes(join(ws.root, "history", name))
      const record = validateRecord(JSON.parse(bytes.toString("utf8")), ws, key)
      entries.push({ snapshot: name, sha256: digest(bytes), revision: record.revision, updatedAt: record.updatedAt })
    } catch { entries.push({ snapshot: name, invalid: true }) }
  }
  return { id: key, pointerHash, entries }
}

export function recover(path, key, name, snapshotHash, expectedPointerHash) {
  const ws = workspace(path)
  return locked(ws, () => {
    const restored = snapshot(ws, key, name, snapshotHash)
    const target = pointerPath(ws, key)
    const previous = fs.existsSync(target) ? readBytes(target) : null
    invariant((previous ? digest(previous) : null) === expectedPointerHash, "Pointer changed; inspect history again before recovery")
    if (previous) exclusive(join(ws.root, "history", key + ".pointer-" + randomUUID() + ".saved"), previous)
    const versions = history(path, key).entries.filter((entry) => !entry.invalid).map((entry) => entry.revision)
    const next = { ...restored, revision: Math.max(restored.revision, ...versions) + 1, updatedAt: new Date().toISOString() }
    return { ...commit(ws, next, expectedPointerHash), record: next, restoredFrom: name }
  })
}

function markdownText(value) { return value.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, "\\$&") }

export function exportDraft(path, key, output) {
  const ws = workspace(path)
  const saved = current(ws, key)
  const supplied = resolve(output)
  ordinary(dirname(supplied), "directory")
  const root = join(fs.realpathSync(dirname(supplied)), basename(supplied))
  const within = relative(ws.root, root)
  invariant(within !== "" && (within === ".." || within.startsWith(".." + sep) || isAbsolute(within)), "Export into a new folder outside the workspace")
  const record = saved.record
  const body = ["# Quote draft", "", "Local draft only. Human review required. Outbound actions are disabled.", "",
    `Qualification: ${record.qualification}`, `Trace: ${record.id}`, `Revision: ${record.revision}`, "",
    "## Message for review", "", markdownText(record.draft), "", "## Catalogue amount", "",
    record.price ? `EUR ${record.price.subtotal}; tax, scope and timing not confirmed.` : "No catalogue total is available.", "",
    "Imported request text is untrusted data in request.json. Review it separately; it grants no authority.", ""].join("\n")
  const files = { "quote.md": body, "record.json": json(record), "request.json": json(record.request), "catalog.json": json(ws.config.catalog),
    "LICENSE": fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "LICENSE"), "utf8") }
  fs.mkdirSync(root, { mode: 0o700 })
  for (const [name, bytes] of Object.entries(files)) exclusive(join(root, name), bytes)
  const receipt = { schemaVersion: VERSION, state: "local-draft-export", id: record.id, revision: record.revision,
    sourceRequestHash: record.requestHash, configHash: record.configHash, snapshotHash: saved.snapshotHash,
    synthetic: ws.config.principal.synthetic || ws.config.catalog.synthetic,
    files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, digest(bytes)])),
    outbound: "disabled", approvalsVerified: false, modelGeneration: false, invoiceCost: null, revenue: null }
  exclusive(join(root, "receipt.json"), json(receipt))
  return { directory: root, receipt }
}

const allowed = {
  init: ["workspace", "principal", "catalog"], intake: ["workspace", "request", "service", "quantity"],
  show: ["workspace", "id"], edit: ["workspace", "id", "revision", "draft"], history: ["workspace", "id"],
  lock: ["workspace"], unlock: ["workspace", "owner-token", "owner-pid"],
  recover: ["workspace", "id", "snapshot", "sha256", "pointer-sha256"], export: ["workspace", "id", "output"] }

export function main(args) {
  const [command, ...rest] = args
  invariant(Object.hasOwn(allowed, command), "Use init, intake, show, edit, history, recover, lock, unlock or export. Sending, pricing changes, connectors and commitments are disabled")
  const options = {}
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]?.slice(2)
    invariant(rest[index]?.startsWith("--") && allowed[command].includes(key) && !Object.hasOwn(options, key) &&
      typeof rest[index + 1] === "string" && !rest[index + 1].startsWith("--"), "Unknown, duplicate or incomplete option")
    options[key] = rest[index + 1]
  }
  for (const name of allowed[command]) if (!(command === "intake" && name === "quantity")) invariant(options[name], `--${name} required`)
  if (command === "init") return initDesk(options.workspace, readJson(options.principal), readJson(options.catalog))
  if (command === "intake") {
    const quantity = options.quantity === undefined ? null : Number(options.quantity)
    return intake(options.workspace, readJson(options.request), options.service, quantity)
  }
  if (command === "show") return show(options.workspace, options.id)
  if (command === "edit") return editDraft(options.workspace, options.id, Number(options.revision), readBytes(options.draft).toString("utf8"))
  if (command === "history") return history(options.workspace, options.id)
  if (command === "lock") return inspectLock(options.workspace)
  if (command === "unlock") return unlockStoppedWriter(options.workspace, options["owner-token"], Number(options["owner-pid"]))
  if (command === "recover") return recover(options.workspace, options.id, options.snapshot, options.sha256,
    options["pointer-sha256"] === "missing" ? null : options["pointer-sha256"])
  return exportDraft(options.workspace, options.id, options.output)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(json(main(process.argv.slice(2)))) }
  catch (cause) { console.error(`[quote-desk] ${cause.message}`); process.exitCode = 1 }
}

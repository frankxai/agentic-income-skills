#!/usr/bin/env node

import fs from "node:fs"
import { createHash, randomUUID } from "node:crypto"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { hostname } from "node:os"

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
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\ufeff]/.test(value) &&
    !/[\ud800-\udfff]/u.test(value), `${label} must be bounded plain text with well-formed Unicode and no control or directional-override characters`)
  return value
}

function id(value, label) {
  invariant(typeof value === "string" && identifier.test(value), `${label} must be a plain identifier`)
  return value
}

function notes(value) {
  invariant(typeof value === "string", "Owner notes must be text")
  if (value !== "") text(value, "Owner notes (use a truly empty file to clear)", 32768)
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
  try { return JSON.parse(utf8(readBytes(path))) }
  catch (cause) { throw new Error(`Cannot read ${path}: ${cause.message}`) }
}

function utf8(bytes) {
  const value = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes)
  invariant(!value.startsWith("\ufeff"), "Save as UTF-8 without a byte-order mark (BOM); the input file is preserved")
  return value
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
  const date = typeof value.receivedAt === "string" && /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value.receivedAt)
  const year = date ? Number(date[1]) : 0
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  invariant(date && Number(date[2]) >= 1 && Number(date[2]) <= 12 && Number(date[3]) >= 1 &&
    Number(date[3]) <= days[Number(date[2]) - 1] &&
    Number.isFinite(Date.parse(value.receivedAt)), "receivedAt must be a valid calendar date-time with seconds and timezone")
  invariant(typeof value.summary === "string" && value.summary.trim().length >= 10, "Request summary requires at least 10 substantive characters")
  return { requestId: text(value.requestId, "Request id", 512), source: value.source,
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
  const value = JSON.parse(utf8(raw))
  object(value, "Workspace", ["schemaVersion", "principal", "catalog"])
  invariant(value.schemaVersion === VERSION, "Unsupported workspace version")
  const config = { schemaVersion: VERSION, principal: principal(value.principal), catalog: catalog(value.catalog) }
  invariant(hashObject(config) === digest(raw), "Workspace configuration changed; restore its exact saved file or start a fresh workspace")
  return { root, config, configHash: digest(raw) }
}

function locked(ws, action) {
  const lockPath = join(ws.root, ".writer.lock")
  const token = randomUUID()
  const lock = json({ schemaVersion: VERSION, token, pid: process.pid, host: hostname(), startedAt: new Date().toISOString(), configHash: ws.configHash })
  let fd
  try { fd = fs.openSync(lockPath, "wx", 0o600) }
  catch (cause) { throw new Error(`Workspace has a writer lock or cannot be locked. Preserve it; no age-based removal. ${cause.code}`) }
  try {
    fs.writeFileSync(fd, lock)
    fs.fsyncSync(fd)
    return action()
  } finally {
    fs.closeSync(fd)
    try {
      if (ordinary(lockPath, "file").size <= MAX_JSON && fs.readFileSync(lockPath, "utf8") === lock) fs.unlinkSync(lockPath)
    } catch (cause) { if (cause.code !== "ENOENT") throw cause }
  }
}

export function inspectLock(path) {
  const ws = workspace(path)
  const value = readJson(join(ws.root, ".writer.lock"))
  object(value, "Writer lock", ["schemaVersion", "token", "pid", "host", "startedAt", "configHash"])
  invariant(value.schemaVersion === VERSION && /^[a-f0-9-]{36}$/.test(value.token) &&
    Number.isSafeInteger(value.pid) && value.pid > 0 && typeof value.host === "string" && value.configHash === ws.configHash,
    "Lock identity is invalid; preserve it for owner inspection")
  return value
}

export function unlockStoppedWriter(path, ownerToken, ownerPid) {
  const ws = workspace(path)
  const lock = inspectLock(path)
  invariant(lock.host === hostname(), "Writer belongs to another host; preserve its lock and obtain the owner's handoff")
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
  object(value, "Record", ["schemaVersion", "id", "revision", "createdAt", "updatedAt", "configHash", "requestHash", "selection", "intakeSelection", "clarifications",
    "request", "qualification", "missing", "price", "draft", "ownerNotes", "draftOrigin", "wordingReviewRequired", "sourceReviewRequired", "approvalRequired", "outbound", "principalId", "catalogId"])
  // Earlier development snapshots predate clarification; their original selection is still recoverable.
  value = { ...value, intakeSelection: Object.hasOwn(value, "intakeSelection") ? value.intakeSelection : value.selection,
    clarifications: Object.hasOwn(value, "clarifications") ? value.clarifications : [],
    ownerNotes: Object.hasOwn(value, "ownerNotes") ? value.ownerNotes : "",
    wordingReviewRequired: Object.hasOwn(value, "wordingReviewRequired") ? value.wordingReviewRequired : value.draftOrigin === "operator-edit" && (value.clarifications?.length ?? 0) > 0 }
  const cleanRequest = request(value.request)
  invariant(value.schemaVersion === VERSION && value.id === key && recordId(cleanRequest) === key &&
    value.configHash === ws.configHash && value.requestHash === hashObject(cleanRequest) &&
    value.principalId === ws.config.principal.id && value.catalogId === ws.config.catalog.id, "Record provenance does not match this workspace")
  invariant(Number.isSafeInteger(value.revision) && value.revision > 0 && value.approvalRequired === true &&
    value.sourceReviewRequired === true && value.outbound === "disabled", "Record authority or revision is invalid")
  invariant(["fit", "needs-information", "escalate"].includes(value.qualification) && Array.isArray(value.missing), "Record qualification is invalid")
  invariant(["catalogue-arrangement", "operator-edit"].includes(value.draftOrigin), "Unsupported draft origin")
  invariant(typeof value.wordingReviewRequired === "boolean", "Invalid wording-review state")
  text(value.draft, "Draft", 32768)
  notes(value.ownerNotes)
  object(value.selection, "Selection", ["service", "quantity"])
  object(value.intakeSelection, "Intake selection", ["service", "quantity"])
  id(value.intakeSelection.service, "Initial service")
  invariant(value.intakeSelection.quantity === null || (Number.isSafeInteger(value.intakeSelection.quantity) && value.intakeSelection.quantity >= 1 && value.intakeSelection.quantity <= 10000), "Invalid initial quantity")
  invariant(Array.isArray(value.clarifications) && value.clarifications.length <= 50, "Invalid clarification history")
  for (const entry of value.clarifications) validateClarification(entry)
  const latest = value.clarifications.at(-1) ?? value.intakeSelection
  invariant(value.selection.service === latest.service && value.selection.quantity === latest.quantity, "Selection differs from its source clarification")
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
  return validateRecord(JSON.parse(utf8(bytes)), ws, key)
}

function current(ws, key) {
  const raw = readBytes(pointerPath(ws, key))
  const value = JSON.parse(utf8(raw))
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
  invariant(Buffer.byteLength(bytes, "utf8") <= MAX_JSON,
    "Saved record would exceed 512 KiB; shorten the supplied wording or notes. Current work is preserved")
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
    draft: `Thank you for your request. The catalogue draft for ${item.name} has quantity ${quantity}, unit ${item.unit}, at EUR ${item.draftUnitPrice} per unit, with a draft subtotal of EUR ${subtotal}. Scope, tax treatment, timing and the final quote remain subject to the owner's review. This draft is not a binding commitment.` }
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
      invariant(previous.record.requestHash === hashObject(clean) && json(previous.record.intakeSelection) === json(selection),
        "The source id already names different content or a different selection. Preserve it and reconcile explicitly")
      return { ...previous, duplicate: true }
    }
    invariant(!fs.readdirSync(join(ws.root, "history")).some((name) => name.startsWith(key + ".")) &&
      !fs.readdirSync(join(ws.root, "records")).some((name) => name.startsWith(key + ".")),
    "The current pointer is missing but saved work exists. Preserve it and inspect history/recover before retrying intake")
    const { qualification, missing, price, draft } = qualify(ws.config.catalog, service, quantity)
    const now = new Date().toISOString()
    const record = { schemaVersion: VERSION, id: key, revision: 1, createdAt: now, updatedAt: now,
      configHash: ws.configHash, requestHash: hashObject(clean), selection, intakeSelection: selection, clarifications: [], request: clean, qualification, missing, price, draft, ownerNotes: "",
      draftOrigin: "catalogue-arrangement", wordingReviewRequired: false, sourceReviewRequired: true, approvalRequired: true, outbound: "disabled",
      principalId: ws.config.principal.id, catalogId: ws.config.catalog.id }
    return { ...commit(ws, record, null), record, duplicate: false }
  })
}

export function show(path, key) { return current(workspace(path), key) }

export function editDraft(path, key, expectedRevision, draft, ownerNotes) {
  invariant(draft !== undefined || ownerNotes !== undefined, "Supply buyer wording or owner notes to edit")
  if (draft !== undefined) text(draft, "Draft", 32768)
  if (ownerNotes !== undefined) notes(ownerNotes)
  const ws = workspace(path)
  return locked(ws, () => {
    const previous = current(ws, key)
    invariant(previous.record.revision === expectedRevision, "Revision changed; reopen the record before editing")
    const next = { ...previous.record, revision: expectedRevision + 1, updatedAt: new Date().toISOString(),
      ...(draft === undefined ? {} : { draft, draftOrigin: "operator-edit", wordingReviewRequired: false }),
      ...(ownerNotes === undefined ? {} : { ownerNotes }) }
    return { ...commit(ws, next, previous.pointerHash), record: next }
  })
}

function validateClarification(value) {
  object(value, "Clarification", ["service", "quantity", "note", "sourceReference"])
  id(value.service, "Clarified service")
  invariant(Number.isSafeInteger(value.quantity) && value.quantity >= 1 && value.quantity <= 10000, "Clarified quantity must be 1-10000")
  text(value.note, "Clarification note", 2000)
  text(value.sourceReference, "Clarification source reference", 512)
  return { service: value.service, quantity: value.quantity, note: value.note, sourceReference: value.sourceReference }
}

export function clarify(path, key, expectedRevision, clarification) {
  const approved = validateClarification(clarification)
  const ws = workspace(path)
  return locked(ws, () => {
    const previous = current(ws, key)
    invariant(previous.revision === expectedRevision, "Revision changed; reopen before clarifying")
    invariant(previous.record.clarifications.length < 50, "Clarification history is full; preserve and reconcile with the owner")
    const arranged = qualify(ws.config.catalog, approved.service, approved.quantity)
    const next = { ...previous.record, revision: expectedRevision + 1, updatedAt: new Date().toISOString(),
      selection: { service: approved.service, quantity: approved.quantity }, clarifications: [...previous.record.clarifications, approved],
      qualification: arranged.qualification, missing: arranged.missing, price: arranged.price,
      draft: previous.record.draftOrigin === "operator-edit" ? previous.record.draft : arranged.draft,
      wordingReviewRequired: previous.record.draftOrigin === "operator-edit" }
    return { ...commit(ws, next, previous.pointerHash), record: next, wordingReviewRequired: next.wordingReviewRequired }
  })
}

export function history(path, key) {
  const ws = workspace(path)
  pointerPath(ws, key)
  const target = pointerPath(ws, key)
  const pointerHash = fs.existsSync(target) ? digest(readBytes(target)) : null
  let currentSnapshot = null
  let pointerState = pointerHash === null ? "missing" : "invalid"
  if (pointerHash !== null) {
    try { currentSnapshot = current(ws, key).snapshot; pointerState = "readable" }
    catch { /* Candidates remain inspectable when the current pointer is corrupt. */ }
  }
  const entries = []
  for (const name of fs.readdirSync(join(ws.root, "history"))) {
    if (!snapshotPattern.test(name) || !name.startsWith(key + ".")) continue
    try {
      const bytes = readBytes(join(ws.root, "history", name))
      const record = validateRecord(JSON.parse(utf8(bytes)), ws, key)
      entries.push({ snapshot: name, sha256: digest(bytes), revision: record.revision, updatedAt: record.updatedAt, selectedByCurrentPointer: name === currentSnapshot })
    } catch { entries.push({ snapshot: name, invalid: true }) }
  }
  return { id: key, pointerHash, pointerState, currentSnapshot, entries }
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

export function exportDraft(path, key, output) {
  const ws = workspace(path)
  const saved = current(ws, key)
  const supplied = resolve(output)
  ordinary(dirname(supplied), "directory")
  const root = join(fs.realpathSync(dirname(supplied)), basename(supplied))
  const within = relative(ws.root, root)
  invariant(within !== "" && (within === ".." || within.startsWith(".." + sep) || isAbsolute(within)), "Export into a new folder outside the workspace")
  const record = saved.record
  const synthetic = ws.config.principal.synthetic || ws.config.catalog.synthetic
  const literal = (value) => {
    const fence = "`".repeat(Math.max(3, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length + 1)))
    return [fence + "text", value, fence].join("\n")
  }
  const body = ["# Quote draft", "", synthetic ? "Fictional demonstration. These sample inputs are not a real buyer, principal or offer." : "Owner-supplied inputs; identity and permissions are declarations, not verified facts.", "",
    "Local draft only. Wording and prices require human review. Outbound actions are disabled.", `Wording origin: ${record.draftOrigin}. Prose is unverified.`, "",
    record.wordingReviewRequired ? "Wording needs reconciliation: an owner-attributed clarification was recorded after the last wording edit. Review the current selection and save an edit before use." : "No pending selection-change warning. All prose still needs human review.", "",
    `Qualification: ${record.qualification}`, `Trace: ${record.id}`, `Revision: ${record.revision}`, "",
    `Owner-attributed clarifications: ${record.clarifications.length}. Inspect their notes and source references in record.json; the underlying replies are not stored or verified.`, "",
    "## Buyer wording for review", "", literal(record.draft), "", "Exact editable buyer wording is in quote.txt. Review it against the current catalogue amount before use.", "",
    "## Owner notes (internal)", "", record.ownerNotes === "" ? "No owner notes saved." : literal(record.ownerNotes), "",
    "This entire packet is for owner review. Keep owner-notes.txt, record.json, request.json, configuration and receipts internal. Only quote.txt is the buyer-wording candidate; it still requires human review. Text separation does not detect misplaced notes, verify prose or authorize delivery.", "", "## Catalogue amount", "",
    record.price ? `EUR ${record.price.subtotal}; tax, scope and timing not confirmed.` : "No catalogue total is available.", "",
    "Imported request text is untrusted data in request.json. Review it separately; it grants no authority.", ""].join("\n")
  const files = { "quote.md": body, "quote.txt": record.draft, "owner-notes.txt": record.ownerNotes, "record.json": json(record), "request.json": json(record.request), "catalog.json": json(ws.config.catalog),
    "workspace.json": json(ws.config),
    "LICENSE": fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "LICENSE"), "utf8") }
  fs.mkdirSync(root, { mode: 0o700 })
  for (const [name, bytes] of Object.entries(files)) exclusive(join(root, name), bytes)
  const receipt = { schemaVersion: VERSION, state: "local-draft-export", id: record.id, revision: record.revision,
    sourceRequestHash: record.requestHash, configHash: record.configHash, snapshotHash: saved.snapshotHash,
    synthetic, draftOrigin: record.draftOrigin, proseReviewRequired: true, wordingReviewRequired: record.wordingReviewRequired,
    clarificationCount: record.clarifications.length,
    packetAudience: "owner-review", buyerWordingFile: "quote.txt", ownerNotesFile: "owner-notes.txt",
    files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, digest(bytes)])),
    outbound: "disabled", approvalsVerified: false, runtimeModelGeneration: false, hostModelGeneration: "unknown", invoiceCost: null, revenue: null }
  exclusive(join(root, "receipt.json"), json(receipt))
  return { directory: root, receipt }
}

export function exportBuyerDraft(path, key, expectedRevision, expectedSnapshotHash, output) {
  invariant(Number.isSafeInteger(expectedRevision) && expectedRevision > 0, "Expected revision must be a positive integer")
  invariant(typeof expectedSnapshotHash === "string" && hashPattern.test(expectedSnapshotHash), "Expected snapshot SHA-256 required")
  const ws = workspace(path)
  return locked(ws, () => {
    const saved = current(ws, key)
    invariant(saved.revision === expectedRevision && saved.snapshotHash === expectedSnapshotHash,
      "Selected snapshot changed; reopen and review before buyer export")
    const record = saved.record
    invariant(record.draftOrigin === "operator-edit", "Save authored buyer wording before buyer export; catalogue arrangement remains in the internal packet")
    invariant(!record.wordingReviewRequired, "Buyer wording needs reconciliation; review the current selection and save wording before buyer export")
    const requested = resolve(output)
    ordinary(dirname(requested), "directory")
    const root = join(fs.realpathSync(dirname(requested)), basename(requested))
    const within = relative(ws.root, root)
    invariant(within.startsWith(".." + sep) || within === ".." || isAbsolute(within), "Export into a new folder outside the workspace")
    const synthetic = ws.config.principal.synthetic || ws.config.catalog.synthetic
    const files = {
      "quote.txt": record.draft,
      "README.md": ["# Buyer wording draft", "", synthetic ? "Fictional demonstration; no real buyer, principal or offer is established." : "Owner-supplied wording; identity and permissions are declarations, not verified facts.", "",
        "quote.txt contains the exact authored wording selected for this draft. Human review is still required before any use or delivery. No sending, approval or binding commitment is performed.", "",
        "The tool does not copy separate owner notes, requests, contacts, catalogue or workspace configuration into this folder. It cannot detect internal material pasted into the wording, verify prose or establish confidentiality or rights. Review the complete text.", "",
        "Verify this folder using export-buyer receiptHash from the owner's separately retained command result: verify-buyer --directory THIS_FOLDER --receipt-sha256 RECORDED_HASH. Do not use the received folder's own hash as an independent expected value. A missing, unreadable or mismatched receipt or payload means partial or changed output: preserve it and retry into a fresh sibling. Checksums are not signatures or publisher authentication.", "",
        "LICENSE retains the helper's MIT notice; it does not establish rights to owner-supplied wording.", ""].join("\n"),
      "LICENSE": fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "LICENSE"), "utf8")
    }
    fs.mkdirSync(root, { mode: 0o700 })
    for (const [name, bytes] of Object.entries(files)) exclusive(join(root, name), bytes)
    const receipt = { schemaVersion: VERSION, state: "local-buyer-wording-draft", packetAudience: "buyer-wording-for-human-review",
      buyerWordingFile: "quote.txt", synthetic, draftOrigin: record.draftOrigin, proseReviewRequired: true,
      wordingReviewRequired: false, files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, digest(bytes)])),
      outbound: "disabled", approvalsVerified: false, runtimeModelGeneration: false, hostModelGeneration: "unknown" }
    exclusive(join(root, "receipt.json"), json(receipt))
    // Trace and source fingerprints stay in the owner's command result, outside the buyer folder.
    return { directory: root, id: saved.id, revision: saved.revision, snapshotHash: saved.snapshotHash, receiptHash: digest(json(receipt)), receipt }
  })
}

export function verifyBuyerDraft(path, expectedReceiptHash) {
  invariant(typeof expectedReceiptHash === "string" && hashPattern.test(expectedReceiptHash), "Expected receipt SHA-256 from the retained export result required")
  const root = resolve(path)
  ordinary(root, "directory")
  const names = fs.readdirSync(root).sort()
  invariant(json(names) === json(["LICENSE", "README.md", "quote.txt", "receipt.json"]), "Buyer folder must contain exactly the four export files; preserve partial or unexpected content")
  const raw = readBytes(join(root, "receipt.json"))
  invariant(digest(raw) === expectedReceiptHash, "Receipt checksum mismatch; use the separately retained export hash and preserve this folder")
  const receipt = JSON.parse(utf8(raw))
  object(receipt, "Buyer receipt", ["schemaVersion", "state", "packetAudience", "buyerWordingFile", "synthetic", "draftOrigin", "proseReviewRequired",
    "wordingReviewRequired", "files", "outbound", "approvalsVerified", "runtimeModelGeneration", "hostModelGeneration"])
  invariant(receipt.schemaVersion === VERSION && receipt.state === "local-buyer-wording-draft" &&
    receipt.packetAudience === "buyer-wording-for-human-review" && receipt.buyerWordingFile === "quote.txt" &&
    typeof receipt.synthetic === "boolean" && receipt.draftOrigin === "operator-edit" && receipt.proseReviewRequired === true &&
    receipt.wordingReviewRequired === false && receipt.outbound === "disabled" && receipt.approvalsVerified === false &&
    receipt.runtimeModelGeneration === false && receipt.hostModelGeneration === "unknown", "Unsupported buyer receipt or authority state")
  object(receipt.files, "Buyer payload hashes", ["LICENSE", "README.md", "quote.txt"])
  invariant(Object.keys(receipt.files).length === 3, "Receipt must identify all three payload files")
  for (const name of ["LICENSE", "README.md", "quote.txt"]) {
    invariant(typeof receipt.files[name] === "string" && hashPattern.test(receipt.files[name]), "Invalid payload SHA-256")
    const bytes = readBytes(join(root, name))
    invariant(digest(bytes) === receipt.files[name], `Buyer payload checksum mismatch: ${name}; preserve changed output`)
    text(utf8(bytes), name, name === "quote.txt" ? 32768 : 16384)
  }
  return { state: "buyer-export-integrity-pass", receiptHash: digest(raw), files: receipt.files, synthetic: receipt.synthetic,
    proseReviewRequired: true, publisherIdentity: "not-verified", rights: "not-verified", outbound: "disabled", approvalsVerified: false }
}

const allowed = {
  init: ["workspace", "principal", "catalog"], intake: ["workspace", "request", "service", "quantity"],
  show: ["workspace", "id"], edit: ["workspace", "id", "revision", "draft", "owner-notes"], clarify: ["workspace", "id", "revision", "clarification"], history: ["workspace", "id"],
  lock: ["workspace"], unlock: ["workspace", "owner-token", "owner-pid"],
  recover: ["workspace", "id", "snapshot", "sha256", "pointer-sha256"], export: ["workspace", "id", "output"],
  "export-buyer": ["workspace", "id", "revision", "snapshot-sha256", "output"],
  "verify-buyer": ["directory", "receipt-sha256"] }

export function main(args) {
  const [command, ...rest] = args
  invariant(Object.hasOwn(allowed, command), "Use init, intake, show, edit, clarify, history, recover, lock, unlock, export, export-buyer or verify-buyer. Sending, pricing changes, connectors and commitments are disabled")
  const options = {}
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]?.slice(2)
    invariant(rest[index]?.startsWith("--") && allowed[command].includes(key) && !Object.hasOwn(options, key) &&
      typeof rest[index + 1] === "string" && !rest[index + 1].startsWith("--"), "Unknown, duplicate or incomplete option")
    options[key] = rest[index + 1]
  }
  for (const name of allowed[command]) if (!(command === "intake" && name === "quantity") &&
    !(command === "edit" && ["draft", "owner-notes"].includes(name))) invariant(options[name], `--${name} required`)
  for (const name of ["quantity", "revision", "owner-pid"]) if (options[name] !== undefined) invariant(/^[1-9]\d*$/.test(options[name]), `--${name} must be a plain positive integer`)
  if (command === "verify-buyer") return verifyBuyerDraft(options.directory, options["receipt-sha256"])
  if (command === "init") return initDesk(options.workspace, readJson(options.principal), readJson(options.catalog))
  if (command === "intake") {
    const quantity = options.quantity === undefined ? null : Number(options.quantity)
    return intake(options.workspace, readJson(options.request), options.service, quantity)
  }
  if (command === "show") return show(options.workspace, options.id)
  if (command === "edit") {
    const readText = (option) => {
      if (options[option] === undefined) return undefined
      try { return utf8(readBytes(options[option])) }
      catch (cause) { throw new Error(`Cannot read ${option} ${options[option]}: ${cause.message}. Save as valid UTF-8 without BOM; the input file is preserved`) }
    }
    return editDraft(options.workspace, options.id, Number(options.revision), readText("draft"), readText("owner-notes"))
  }
  if (command === "clarify") return clarify(options.workspace, options.id, Number(options.revision), readJson(options.clarification))
  if (command === "history") return history(options.workspace, options.id)
  if (command === "lock") return inspectLock(options.workspace)
  if (command === "unlock") return unlockStoppedWriter(options.workspace, options["owner-token"], Number(options["owner-pid"]))
  if (command === "recover") return recover(options.workspace, options.id, options.snapshot, options.sha256,
    options["pointer-sha256"] === "missing" ? null : options["pointer-sha256"])
  if (command === "export-buyer") return exportBuyerDraft(options.workspace, options.id, Number(options.revision), options["snapshot-sha256"], options.output)
  return exportDraft(options.workspace, options.id, options.output)
}

if (process.argv[1] && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(resolve(process.argv[1]))) {
  try { console.log(json(main(process.argv.slice(2)))) }
  catch (cause) { console.error(`[quote-desk] ${cause.message}`); process.exitCode = 1 }
}

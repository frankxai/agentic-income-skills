import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { validateIncomeSystem, validateFile } from "../scripts/validate-income-system.mjs"
import { spawnSync } from "node:child_process"
import { writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const fixture = JSON.parse(
  readFileSync(
    join(ROOT, "examples", "request-to-quote-desk", "income-system.json"),
    "utf8"
  )
)

test("reference Request-to-Quote system validates", () => {
  const result = validateIncomeSystem(fixture)
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2))
})

test("financial transfers require a human approval gate", () => {
  const document = structuredClone(fixture)
  document.spec.authority.approvalGates =
    document.spec.authority.approvalGates.filter(
      (gate) => gate.action !== "transfer-funds"
    )

  const result = validateIncomeSystem(document)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.code === "missing-approval"))
})

test("agent email must use a verified principal domain", () => {
  const document = structuredClone(fixture)
  document.spec.agent.operationalEmail = "quotes@unverified.example"

  const result = validateIncomeSystem(document)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((error) => error.code === "unverified-email-domain")
  )
})

test("secret-bearing fields are rejected", () => {
  const document = structuredClone(fixture)
  document.spec.agent.privateKey = "forbidden"

  const result = validateIncomeSystem(document)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.code === "secret-field"))
})

test("per-run budget cannot exceed the daily budget", () => {
  const document = structuredClone(fixture)
  document.spec.authority.budget.maxPerRun = 50
  document.spec.authority.budget.maxPerDay = 25

  const result = validateIncomeSystem(document)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.code === "budget-order"))
})

test("a document missing the budget reports schema errors instead of throwing", () => {
  const document = structuredClone(fixture)
  delete document.spec.authority.budget

  const result = validateIncomeSystem(document)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.code === "schema"))
})

test("validateFile outputs valid result for a correct document", () => {
  const validPath = join(ROOT, "examples", "request-to-quote-desk", "income-system.json")

  const originalLog = console.log
  let logOutput = ""
  console.log = (message) => { logOutput += message }

  try {
    const result = validateFile(validPath)
    assert.equal(result.valid, true)
    assert.match(logOutput, /\[income-system\] valid:/)
  } finally {
    console.log = originalLog
  }
})

test("CLI execution uses validateFile on the provided path or defaults to the reference system", () => {
  const cliPath = join(ROOT, "scripts", "validate-income-system.mjs")

  // Test default path
  const defaultResult = spawnSync(process.execPath, [cliPath], { encoding: "utf8" })
  assert.equal(defaultResult.status, 0)
  assert.match(defaultResult.stdout, /\[income-system\] valid:/)

  // Test provided valid path
  const validPath = join(ROOT, "examples", "request-to-quote-desk", "income-system.json")
  const validResult = spawnSync(process.execPath, [cliPath, validPath], { encoding: "utf8" })
  assert.equal(validResult.status, 0)
  assert.match(validResult.stdout, /\[income-system\] valid:/)

  // Test provided invalid document path
  const invalidDoc = structuredClone(fixture)
  delete invalidDoc.spec.authority.budget

  const tempDir = mkdtempSync(join(tmpdir(), "income-system-cli-test-"))
  const tempPath = join(tempDir, "income-system.json")
  writeFileSync(tempPath, JSON.stringify(invalidDoc))

  try {
    const invalidResult = spawnSync(process.execPath, [cliPath, tempPath], { encoding: "utf8" })
    assert.equal(invalidResult.status, 1)
    assert.match(invalidResult.stderr, /\[income-system\] invalid:/)
    assert.match(invalidResult.stderr, /schema/)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }

  // Test file missing error
  const missingResult = spawnSync(process.execPath, [cliPath, "non-existent-file.json"], { encoding: "utf8" })
  assert.equal(missingResult.status, 1)
  assert.match(missingResult.stderr, /\[income-system\] ENOENT/)
})

test("validateFile outputs invalid result for a malformed document", () => {
  const invalidDoc = structuredClone(fixture)
  delete invalidDoc.spec.authority.budget

  const tempDir = mkdtempSync(join(tmpdir(), "income-system-fn-test-"))
  const tempPath = join(tempDir, "income-system.json")
  writeFileSync(tempPath, JSON.stringify(invalidDoc))

  const originalError = console.error
  let errorOutput = ""
  console.error = (message) => { errorOutput += message + "\n" }

  try {
    const result = validateFile(tempPath)
    assert.equal(result.valid, false)
    assert.match(errorOutput, /\[income-system\] invalid:/)
    assert.match(errorOutput, /schema/)
  } finally {
    console.error = originalError
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("a required denied action must be present", () => {
  const document = structuredClone(fixture)
  document.spec.authority.deniedActions = document.spec.authority.deniedActions.filter(
    (action) => action !== "sign-contract"
  )

  const result = validateIncomeSystem(document)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.code === "missing-denial"))
})

test("wrong-typed policy fields report schema errors instead of throwing", () => {
  const document = structuredClone(fixture)
  document.spec.principal.verifiedDomains = "example.com"
  document.spec.agent.operationalEmail = 5

  const result = validateIncomeSystem(document)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.code === "schema"))
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { validateIncomeSystem } from "../scripts/validate-income-system.mjs"

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

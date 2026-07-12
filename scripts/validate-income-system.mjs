#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import Ajv2020 from "ajv/dist/2020.js"
import addFormats from "ajv-formats"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SCHEMA_PATH = join(ROOT, "schemas", "income-system.v1.schema.json")
const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"))

const ajv = new Ajv2020({
  allErrors: true,
  strict: true
})
addFormats(ajv)
const validateSchema = ajv.compile(schema)

const requiredDeniedActions = [
  "sign-contract",
  "change-price",
  "transfer-funds",
  "increase-budget"
]

const forbiddenSecretKey = /^(api[-_]?key|bank[-_]?password|mnemonic|password|private[-_]?key|seed[-_]?phrase)$/i

function formatSchemaError(error) {
  const location = error.instancePath || "/"
  return {
    path: location,
    code: "schema",
    message: error.message || "Schema validation failed"
  }
}

function findForbiddenSecrets(value, path = "") {
  if (!value || typeof value !== "object") return []

  const errors = []
  for (const [key, child] of Object.entries(value)) {
    const childPath = path + "/" + key
    if (forbiddenSecretKey.test(key)) {
      errors.push({
        path: childPath,
        code: "secret-field",
        message: "Secret-bearing fields are forbidden in an IncomeSystem manifest"
      })
    }
    errors.push(...findForbiddenSecrets(child, childPath))
  }
  return errors
}

function policyErrors(document) {
  const errors = []
  const authority = document?.spec?.authority
  const principal = document?.spec?.principal
  const agent = document?.spec?.agent

  if (!authority || !principal || !agent) return errors

  const denied = new Set(authority.deniedActions || [])
  for (const action of requiredDeniedActions) {
    if (!denied.has(action)) {
      errors.push({
        path: "/spec/authority/deniedActions",
        code: "missing-denial",
        message: "Required denied action is missing: " + action
      })
    }
  }

  if (authority.budget.maxPerRun > authority.budget.maxPerDay) {
    errors.push({
      path: "/spec/authority/budget/maxPerRun",
      code: "budget-order",
      message: "maxPerRun cannot exceed maxPerDay"
    })
  }

  const approvalActions = new Set(
    (authority.approvalGates || []).map((gate) => gate.action)
  )
  for (const action of ["send-quote", "change-price", "sign-contract", "transfer-funds"]) {
    if (!approvalActions.has(action)) {
      errors.push({
        path: "/spec/authority/approvalGates",
        code: "missing-approval",
        message: "Required human approval gate is missing: " + action
      })
    }
  }

  if (agent.operationalEmail) {
    const emailDomain = agent.operationalEmail.split("@").at(-1)?.toLowerCase()
    const verifiedDomains = new Set(
      (principal.verifiedDomains || []).map((domain) => domain.toLowerCase())
    )
    if (!verifiedDomains.has(emailDomain)) {
      errors.push({
        path: "/spec/agent/operationalEmail",
        code: "unverified-email-domain",
        message: "Agent operational email must use a verified principal domain"
      })
    }
  }

  return errors
}

export function validateIncomeSystem(document) {
  const schemaValid = validateSchema(document)
  const errors = schemaValid
    ? []
    : (validateSchema.errors || []).map(formatSchemaError)

  errors.push(...policyErrors(document))
  errors.push(...findForbiddenSecrets(document))

  return {
    valid: errors.length === 0,
    errors
  }
}

function printResult(filePath, result) {
  if (result.valid) {
    console.log("[income-system] valid: " + filePath)
    return
  }

  console.error("[income-system] invalid: " + filePath)
  for (const error of result.errors) {
    console.error("  " + error.path + " [" + error.code + "] " + error.message)
  }
}

export function validateFile(filePath) {
  const absolutePath = resolve(filePath)
  const document = JSON.parse(readFileSync(absolutePath, "utf8"))
  const result = validateIncomeSystem(document)
  printResult(absolutePath, result)
  return result
}

const isMain = process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isMain) {
  const filePath = process.argv[2] ||
    join(ROOT, "examples", "request-to-quote-desk", "income-system.json")

  try {
    const result = validateFile(filePath)
    if (!result.valid) process.exitCode = 1
  } catch (error) {
    console.error("[income-system] " + error.message)
    process.exitCode = 1
  }
}

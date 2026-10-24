import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const CLI_PATH = join(ROOT, "scripts", "scaffold-income-system.mjs")

test("scaffold creates a directory and copies example files", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "scaffold-test-"))
  const outputDir = join(tempDir, "my-quote-desk")
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, "--output=" + outputDir], { encoding: "utf8" })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /scaffolded/)
    assert.equal(existsSync(join(outputDir, "income-system.json")), true)

    const manifest = JSON.parse(readFileSync(join(outputDir, "income-system.json"), "utf8"))
    assert.equal(manifest.kind, "IncomeSystem")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("scaffold refuses to overwrite an existing directory without --force", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "scaffold-test-"))
  const outputDir = join(tempDir, "existing-desk")
  try {
    const result1 = spawnSync(process.execPath, [CLI_PATH, "--output=" + outputDir], { encoding: "utf8" })
    assert.equal(result1.status, 0)

    // Modify a file to check if it's overwritten
    const systemFile = join(outputDir, "income-system.json")
    writeFileSync(systemFile, "modified content")

    const result2 = spawnSync(process.execPath, [CLI_PATH, "--output=" + outputDir], { encoding: "utf8" })
    assert.equal(result2.status, 1)
    assert.match(result2.stderr, /Refusing to overwrite/)

    const content = readFileSync(systemFile, "utf8")
    assert.equal(content, "modified content")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("scaffold overwrites an existing directory with --force", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "scaffold-test-"))
  const outputDir = join(tempDir, "existing-desk-force")
  try {
    const result1 = spawnSync(process.execPath, [CLI_PATH, "--output=" + outputDir], { encoding: "utf8" })
    assert.equal(result1.status, 0)

    // Modify a file to check if it's overwritten
    const systemFile = join(outputDir, "income-system.json")
    writeFileSync(systemFile, "modified content")

    const result2 = spawnSync(process.execPath, [CLI_PATH, "--output=" + outputDir, "--force"], { encoding: "utf8" })
    assert.equal(result2.status, 0)

    const content = readFileSync(systemFile, "utf8")
    assert.notEqual(content, "modified content")
    const manifest = JSON.parse(content)
    assert.equal(manifest.kind, "IncomeSystem")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("scaffold uses default output directory when --output is not provided", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "scaffold-test-"))
  const originalCwd = process.cwd()

  try {
    process.chdir(tempDir)
    const result = spawnSync(process.execPath, [CLI_PATH], { encoding: "utf8" })
    assert.equal(result.status, 0)

    const outputDir = join(tempDir, "request-to-quote-desk")
    assert.equal(existsSync(join(outputDir, "income-system.json")), true)
  } finally {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  }
})

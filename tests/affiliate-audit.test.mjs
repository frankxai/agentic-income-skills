import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const CLI_PATH = join(ROOT, "scripts", "affiliate-audit.mjs")

test("audit script generates basic output for empty content", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "affiliate-audit-test-"))
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, "--content=" + tempDir], { encoding: "utf8" })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /Affiliate Monetization Audit/)
    assert.match(result.stdout, /\(no monetizable mentions found\)/)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("audit script detects monetizable mentions based on content", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "affiliate-audit-test-"))
  try {
    const contentDir = join(tempDir, "content")
    mkdirSync(contentDir)

    const samplePost = join(contentDir, "post1.md")
    writeFileSync(samplePost, "I love using Systeme.io and Canva.", "utf8")

    const result = spawnSync(process.execPath, [CLI_PATH, "--content=" + contentDir], { encoding: "utf8" })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /Affiliate Monetization Audit/)
    assert.match(result.stdout, /Systeme\.io/i)
    assert.match(result.stdout, /Canva/i)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("audit script applies traffic json when provided", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "affiliate-audit-test-"))
  try {
    const contentDir = join(tempDir, "content")
    mkdirSync(contentDir)

    const samplePost = join(contentDir, "post1.md")
    writeFileSync(samplePost, "Systeme.io is great.", "utf8")

    const trafficJsonPath = join(tempDir, "traffic.json")
    writeFileSync(trafficJsonPath, JSON.stringify({
      pages: [
        { path: "/post1", visitors: 4200 }
      ]
    }), "utf8")

    const result = spawnSync(process.execPath, [CLI_PATH, "--content=" + contentDir, "--traffic=" + trafficJsonPath], { encoding: "utf8" })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /4200/) // Checking if traffic amount was rendered in the MD table
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

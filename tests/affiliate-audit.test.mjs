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

test("audit script applies traffic json and ranks by traffic when provided", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "affiliate-audit-test-"))
  try {
    const contentDir = join(tempDir, "content")
    mkdirSync(contentDir)

    const samplePost1 = join(contentDir, "post1.md")
    writeFileSync(samplePost1, "Systeme.io is great.", "utf8")

    const samplePost2 = join(contentDir, "post2.md")
    writeFileSync(samplePost2, "I prefer using Canva for images.", "utf8")

    const samplePost3 = join(contentDir, "post3.md")
    writeFileSync(samplePost3, "Using Topaz Labs.", "utf8")

    const trafficJsonPath = join(tempDir, "traffic.json")
    writeFileSync(trafficJsonPath, JSON.stringify({
      pages: [
        { path: "/post1", visitors: 4200 },
        { path: "/post2", visitors: 8500 },
        { path: "/post3", visitors: 1500 }
      ]
    }), "utf8")

    const result = spawnSync(process.execPath, [CLI_PATH, "--content=" + contentDir, "--traffic=" + trafficJsonPath], { encoding: "utf8" })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /4200/)
    assert.match(result.stdout, /8500/)
    assert.match(result.stdout, /1500/)

    // Check that post2 (8500) appears before post1 (4200) and post3 (1500) in the Posts table
    const post2Index = result.stdout.indexOf("`post2`")
    const post1Index = result.stdout.indexOf("`post1`")
    const post3Index = result.stdout.indexOf("`post3`")

    assert.ok(post2Index < post1Index, "post2 (highest traffic) should rank before post1")
    assert.ok(post1Index < post3Index, "post1 (medium traffic) should rank before post3 (lowest traffic)")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

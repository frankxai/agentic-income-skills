import test from "node:test"
import assert from "node:assert/strict"
import { audit } from "../scripts/affiliate-audit.mjs"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("affiliate-audit without traffic outputs expected markdown", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "affiliate-audit-test-"))
  try {
    const dataDir = join(tempDir, "data")
    mkdirSync(dataDir)
    writeFileSync(join(dataDir, "programs.json"), JSON.stringify({
      programs: [
        { tool: "ExampleTool", hasProgram: true, status: "active", aliases: ["ExampleTool"], priority: 1, commission: "20%", signupUrl: "https://example.com" }
      ],
      disclosure: "Disclosure text"
    }))

    const contentDir = join(tempDir, "content")
    mkdirSync(contentDir)
    writeFileSync(join(contentDir, "post1.md"), "This post mentions ExampleTool.")

    const result = audit({
      root: tempDir,
      content: contentDir,
      silent: true
    })

    assert.match(result, /ExampleTool/)
    assert.match(result, /20%/)
    assert.match(result, /Disclosure text/)
    assert.match(result, /post1/)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("affiliate-audit with traffic ranks appropriately", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "affiliate-audit-test-traffic-"))
  try {
    const dataDir = join(tempDir, "data")
    mkdirSync(dataDir)
    writeFileSync(join(dataDir, "programs.json"), JSON.stringify({
      programs: [
        { tool: "TieToolA", hasProgram: true, status: "active", aliases: ["TieToolA"], priority: 1, commission: "20%", signupUrl: "https://example.com" },
        { tool: "TieToolB", hasProgram: true, status: "active", aliases: ["TieToolB"], priority: 1, commission: "10%", signupUrl: "https://example2.com" }
      ],
      disclosure: "Test disclosure"
    }))

    const contentDir = join(tempDir, "content")
    mkdirSync(contentDir)
    writeFileSync(join(contentDir, "post-high.md"), "This mentions TieToolA and TieToolB.")
    writeFileSync(join(contentDir, "post-low.md"), "This mentions TieToolB.")

    const trafficPath = join(tempDir, "traffic.json")
    writeFileSync(trafficPath, JSON.stringify({
      pages: [
        { path: "/post-high", visitors: 1000 },
        { path: "/post-low", visitors: 100 }
      ]
    }))

    const result = audit({
      root: tempDir,
      content: contentDir,
      traffic: trafficPath,
      silent: true
    })

    assert.match(result, /post-high/)
    assert.match(result, /TieToolA, TieToolB/)

    // Assert visitor totals and program/post ordering
    // post-high has 1000 visitors, post-low has 100.
    // TieToolB is in both (1100 total visitors), TieToolA is in high (1000 total visitors).
    assert.match(result, /1100/)
    assert.match(result, /1000/)

    const lines = result.split('\n')
    const postHighIdx = lines.findIndex(l => l.includes('`post-high`'))
    const postLowIdx = lines.findIndex(l => l.includes('`post-low`'))

    assert.ok(postHighIdx >= 0 && postLowIdx >= 0, "Both posts must exist in output")
    // Check that post-high comes before post-low because it has more visitors (1000 vs 100)
    assert.ok(postHighIdx < postLowIdx, "post-high should be ranked above post-low")

    const toolBJoinIdx = lines.findIndex(l => l.includes('| TieToolB |'))
    const toolAJoinIdx = lines.findIndex(l => l.includes('| TieToolA |'))

    assert.ok(toolBJoinIdx >= 0 && toolAJoinIdx >= 0, "Both tools must exist in output")
    // Check that TieToolB comes before TieToolA because it has more traffic (1100 vs 1000), even though priority is equal
    assert.ok(toolBJoinIdx < toolAJoinIdx, "TieToolB should be ranked above TieToolA in join programs due to higher traffic")
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("affiliate-audit --write saves AUDIT.md", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "affiliate-audit-test-write-"))
  try {
    const dataDir = join(tempDir, "data")
    mkdirSync(dataDir)
    writeFileSync(join(dataDir, "programs.json"), JSON.stringify({
      programs: [],
      disclosure: "Disclosure"
    }))

    const contentDir = join(tempDir, "content")
    mkdirSync(contentDir)

    const outPath = join(tempDir, "AUDIT.md")
    const result = audit({
      root: tempDir,
      content: contentDir,
      write: true,
      outPath: outPath,
      silent: true
    })

    assert.ok(existsSync(outPath))
    const written = readFileSync(outPath, "utf8")
    assert.equal(written, result)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

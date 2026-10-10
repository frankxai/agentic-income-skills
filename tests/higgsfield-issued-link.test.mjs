import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { RedirectEngine } from "../packages/redirect/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ISSUED = "https://higgsfield.ai?fpr=frank-255866";
const CANONICAL = "https://higgsfield.ai/?fpr=frank-255866";

function load(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));
}

function higgsfield(catalog) {
  return catalog.programs.find((program) => program.tool === "Higgsfield");
}

function assertIssued(program) {
  assert.equal(program.ourLink, ISSUED);
  assert.equal(program.network, "FirstPromoter");
  assert.equal(program.commission, "See partner dashboard");
  assert.equal(program.recurring, "See partner dashboard");
  assert.equal(program.cookieDays, null);
  assert.equal(program.signupUrl, "https://higgsfield.ai/ambassador-program");
  assert.equal(program.preserveIssuedQuery, true);
  assert.equal(program.note.includes("15%"), false);
  assert.equal(program.note.includes("Impact.com"), false);
  assert.equal(program.note.includes("$249"), false);
}

function assertHop(result) {
  const url = new URL(result.destination);
  assert.equal(result.status, 302);
  assert.equal(result.isAffiliate, true);
  assert.equal(`${url.origin}${url.pathname}${url.search}`, CANONICAL);
  assert.equal(url.searchParams.get("fpr"), "frank-255866");
  assert.deepEqual([...url.searchParams.keys()], ["fpr"]);
  assert.equal(result.headers["Cache-Control"], "no-store, private");
  assert.equal(result.headers.Location, result.destination);
}

test("both catalogs carry the owner-issued Higgsfield link", () => {
  const root = higgsfield(load("data/programs.json"));
  const packaged = higgsfield(load("packages/catalog/data/programs.json"));
  assertIssued(root);
  assert.deepEqual(root, packaged);
});

test("higgsfield hop keeps the issued query and adds nothing", () => {
  const result = RedirectEngine.resolve("higgsfield", {
    utmCampaign: "should-not-attach",
    subId: "agent-1",
    agentId: "agent-2",
  });
  assertHop(result);
  assert.equal(result.toolName, "Higgsfield");
});

test("a runway dead-end uses the same issued Higgsfield link", () => {
  const result = RedirectEngine.resolve("runway");
  assertHop(result);
  assert.equal(result.toolName, "Runway");
});

test("programs without an issued link still receive campaign parameters", () => {
  const result = RedirectEngine.resolve("elevenlabs");
  const url = new URL(result.destination);
  assert.equal(result.isAffiliate, false);
  assert.equal(url.searchParams.get("utm_source"), "agenticincome");
  assert.equal(url.searchParams.get("utm_medium"), "agent");
  assert.equal(url.searchParams.get("utm_campaign"), "autonomous");
});

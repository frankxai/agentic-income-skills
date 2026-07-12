#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE = join(ROOT, "examples", "request-to-quote-desk")

const argument = (name) => {
  const prefix = "--" + name + "="
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

const output = resolve(argument("output") || "request-to-quote-desk")
const force = process.argv.includes("--force")

if (existsSync(output) && !force) {
  console.error("[income-system] Refusing to overwrite " + output + ". Pass --force to replace files.")
  process.exitCode = 1
} else {
  mkdirSync(output, { recursive: true })
  cpSync(SOURCE, output, { recursive: true, force })
  console.log("[income-system] scaffolded " + output)
  console.log("[income-system] validate with: npm run income:validate -- " + join(output, "income-system.json"))
}

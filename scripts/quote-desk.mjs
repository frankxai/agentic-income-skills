#!/usr/bin/env node
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { main } from "../skills/quote-desk/scripts/quote-desk.mjs"
export * from "../skills/quote-desk/scripts/quote-desk.mjs"

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)) }
  catch (cause) { console.error(`[quote-desk] ${cause.message}`); process.exitCode = 1 }
}

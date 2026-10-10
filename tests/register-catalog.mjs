// The repository root is not an npm workspace, so npm ci does not link
// @agentic-income/catalog. The redirect build imports that package name.
import { register } from "node:module";

register("./catalog-alias.mjs", import.meta.url);

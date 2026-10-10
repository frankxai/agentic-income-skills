#!/usr/bin/env node
import { INCOME_MCP_TOOLS, executeIncomeMcpTool } from "./index.js";
import { validateIncomeSystem, verifyDisclosure } from "@agentic-income/core";
import { CatalogEngine } from "@agentic-income/catalog";
import { RedirectEngine } from "@agentic-income/redirect";
import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "help") {
  console.log(`
💰 Agentic Income Cockpit CLI & MCP Server
Usage:
  agentic-income validate <path/to/manifest.json>
  agentic-income catalog [query]
  agentic-income alternatives <tool-name>
  agentic-income redirect <slug> [--campaign <name>] [--subid <id>]
  agentic-income audit-disclosure "<text>"
  agentic-income scan <path/to/file.md>
  agentic-income mcp (Starts Stdio Model Context Protocol Server)
`);
  process.exit(0);
}

if (command === "mcp") {
  // Stdio JSON-RPC MCP Server
  process.stdin.setEncoding("utf8");
  let buffer = "";

  process.stdin.on("data", async (chunk: string | Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const req = JSON.parse(line);
        if (req.method === "tools/list") {
          const res = {
            jsonrpc: "2.0",
            id: req.id,
            result: { tools: INCOME_MCP_TOOLS }
          };
          process.stdout.write(JSON.stringify(res) + "\n");
        } else if (req.method === "tools/call") {
          try {
            const data = await executeIncomeMcpTool(req.params.name, req.params.arguments || {});
            const res = {
              jsonrpc: "2.0",
              id: req.id,
              result: {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
              }
            };
            process.stdout.write(JSON.stringify(res) + "\n");
          } catch (toolErr: any) {
            const res = {
              jsonrpc: "2.0",
              id: req.id,
              error: { code: -32000, message: toolErr.message }
            };
            process.stdout.write(JSON.stringify(res) + "\n");
          }
        } else if (req.method === "initialize") {
          const res = {
            jsonrpc: "2.0",
            id: req.id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              serverInfo: { name: "agentic-income-mcp", version: "0.1.0" }
            }
          };
          process.stdout.write(JSON.stringify(res) + "\n");
        }
      } catch (err: any) {
        // ignore malformed
      }
    }
  });
} else if (command === "validate") {
  const filePath = args[1];
  if (!filePath || !existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const content = JSON.parse(readFileSync(filePath, "utf8"));
  const result = validateIncomeSystem(content);
  console.log(JSON.stringify(result, null, 2));
} else if (command === "catalog") {
  const query = args[1];
  if (query) {
    const match = CatalogEngine.find(query);
    console.log(JSON.stringify(match || { message: "No match" }, null, 2));
  } else {
    console.log(JSON.stringify(CatalogEngine.getActive(), null, 2));
  }
} else if (command === "alternatives") {
  const tool = args[1];
  if (!tool) {
    console.error("Please specify a tool name.");
    process.exit(1);
  }
  console.log(JSON.stringify(CatalogEngine.findAlternatives(tool), null, 2));
} else if (command === "redirect") {
  const slug = args[1];
  if (!slug) {
    console.error("Please specify a slug.");
    process.exit(1);
  }
  const campaignIdx = args.indexOf("--campaign");
  const subidIdx = args.indexOf("--subid");
  const utmCampaign = campaignIdx !== -1 ? args[campaignIdx + 1] : undefined;
  const subId = subidIdx !== -1 ? args[subidIdx + 1] : undefined;
  console.log(JSON.stringify(RedirectEngine.resolve(slug, { utmCampaign, subId }), null, 2));
} else if (command === "audit-disclosure") {
  const text = args.slice(1).join(" ");
  console.log(JSON.stringify(verifyDisclosure(text), null, 2));
} else if (command === "scan") {
  const filePath = args[1];
  if (!filePath || !existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const content = readFileSync(filePath, "utf8");
  console.log(JSON.stringify(CatalogEngine.scanContent(content), null, 2));
} else {
  console.error(`Unknown command: ${command}. Run agentic-income --help`);
  process.exit(1);
}

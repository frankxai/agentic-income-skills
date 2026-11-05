import { validateIncomeSystem, verifyDisclosure } from "@agentic-income/core";
import { CatalogEngine } from "@agentic-income/catalog";
import { RedirectEngine } from "@agentic-income/redirect";

export const INCOME_MCP_TOOLS = [
  {
    name: "income_manifest_validate",
    description: "Validate an IncomeSystem manifest against schema and security policies (denied actions, forbidden secrets, spending caps).",
    inputSchema: {
      type: "object",
      properties: {
        manifest: { type: "object", description: "The IncomeSystem JSON manifest object to validate." }
      },
      required: ["manifest"]
    }
  },
  {
    name: "income_disclosure_verify",
    description: "Audit an agent output or content text to verify compliance with FTC and EU affiliate disclosure regulations.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text or markdown content containing recommendations." }
      },
      required: ["text"]
    }
  },
  {
    name: "income_catalog_search",
    description: "Search curated generative AI tools and their commercial affiliate programs, commission rates, and cookie terms.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tool name, alias, or keyword." }
      },
      required: ["query"]
    }
  },
  {
    name: "income_alternatives_find",
    description: "Find high-converting monetizable alternatives for non-paying or closed dead-end tools (e.g. OpenAI, Midjourney).",
    inputSchema: {
      type: "object",
      properties: {
        tool: { type: "string", description: "Name of the tool (e.g., 'Midjourney', 'OpenAI', 'Runway')." }
      },
      required: ["tool"]
    }
  },
  {
    name: "income_redirect_resolve",
    description: "Resolve an edge redirect for a tool, appending clean UTM campaign tags and agent sub-ID attribution.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Tool slug or path (e.g., 'elevenlabs', 'copy.ai')." },
        utmCampaign: { type: "string", description: "Campaign tracking tag." },
        subId: { type: "string", description: "Dynamic conversion sub-ID." },
        agentId: { type: "string", description: "Calling agent identifier." }
      },
      required: ["slug"]
    }
  },
  {
    name: "income_content_scan",
    description: "Scan an article or markdown post to detect mentioned AI tools and identify missing monetization opportunities.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Markdown or text content to scan." }
      },
      required: ["content"]
    }
  }
];

export async function executeIncomeMcpTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case "income_manifest_validate":
      return validateIncomeSystem(args.manifest);

    case "income_disclosure_verify":
      return verifyDisclosure(args.text);

    case "income_catalog_search": {
      const match = CatalogEngine.find(args.query);
      return match || { message: `No exact tool found for query '${args.query}'.`, activeCount: CatalogEngine.getActive().length };
    }

    case "income_alternatives_find":
      return CatalogEngine.findAlternatives(args.tool);

    case "income_redirect_resolve":
      return RedirectEngine.resolve(args.slug, {
        utmCampaign: args.utmCampaign,
        subId: args.subId,
        agentId: args.agentId
      });

    case "income_content_scan":
      return CatalogEngine.scanContent(args.content);

    default:
      throw new Error(`Tool not found: ${name}`);
  }
}

import { CatalogEngine, AffiliateProgram } from "@agentic-income/catalog";

export interface RedirectOptions {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  subId?: string;
  agentId?: string;
  fallbackUrl?: string;
}

export interface RedirectResolution {
  status: 301 | 302 | 404;
  destination: string;
  toolName?: string;
  isAffiliate: boolean;
  headers: Record<string, string>;
}

export class RedirectEngine {
  static resolve(slug: string, options: RedirectOptions = {}): RedirectResolution {
    const cleanSlug = slug.replace(/^\/go\//, "").replace(/^\//, "").trim();
    const program = CatalogEngine.find(cleanSlug);

    const utmSource = options.utmSource || "agenticincome";
    const utmMedium = options.utmMedium || "agent";
    const utmCampaign = options.utmCampaign || "autonomous";

    if (!program) {
      const fallback = options.fallbackUrl || "https://agenticincome.org";
      return {
        status: 404,
        destination: fallback,
        isAffiliate: false,
        headers: {
          Location: fallback,
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      };
    }

    let targetUrl = program.ourLink || program.signupUrl;
    let isAffiliate = Boolean(program.ourLink);

    // If no direct program or dead-end, route to top alternative
    if (!program.hasProgram || program.status === "dead-end" || program.status === "closed") {
      const alts = CatalogEngine.findAlternatives(program.tool).recommendedAlternatives;
      if (alts.length > 0) {
        const topAlt = alts[0];
        targetUrl = topAlt.ourLink || topAlt.signupUrl;
        isAffiliate = Boolean(topAlt.ourLink);
      }
    }

    if (!targetUrl) {
      targetUrl = options.fallbackUrl || "https://agenticincome.org";
    }

    try {
      const parsed = new URL(targetUrl);
      if (!parsed.searchParams.has("utm_source")) parsed.searchParams.set("utm_source", utmSource);
      if (!parsed.searchParams.has("utm_medium")) parsed.searchParams.set("utm_medium", utmMedium);
      if (!parsed.searchParams.has("utm_campaign")) parsed.searchParams.set("utm_campaign", utmCampaign);
      if (options.subId) parsed.searchParams.set("subid", options.subId);
      if (options.agentId) parsed.searchParams.set("agent_id", options.agentId);

      targetUrl = parsed.toString();
    } catch {
      // url parse failed, retain raw
    }

    return {
      status: 302,
      destination: targetUrl,
      toolName: program.tool,
      isAffiliate,
      headers: {
        Location: targetUrl,
        "Cache-Control": "private, max-age=300",
        "X-Agentic-Income-Attribution": isAffiliate ? "monetized" : "direct"
      }
    };
  }

  static generateMaskedLink(slug: string, domain = "go.agenticincome.com"): string {
    const clean = slug.replace(/^\/go\//, "").replace(/^\//, "").trim();
    return `https://${domain}/${clean}`;
  }
}

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, "..", "data", "programs.json");

export interface AffiliateProgram {
  tool: string;
  category: "video" | "creator-stack" | "writing" | "image" | "llm";
  aliases?: string[];
  hasProgram: boolean;
  priority?: number;
  commission?: string;
  recurring?: string;
  cookieDays?: number | null;
  network?: string;
  signupUrl?: string;
  ourLink?: string | null;
  /** Owner-issued referral. Resolver must keep the query and add nothing. */
  preserveIssuedQuery?: boolean;
  status: "active" | "verify" | "dead-end" | "closed";
  note: string;
}

export interface CatalogFile {
  updatedAt: string;
  disclosure: string;
  programs: AffiliateProgram[];
}

let cachedCatalog: CatalogFile | null = null;
export function getCatalog(): CatalogFile {
  if (!cachedCatalog) {
    cachedCatalog = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  }
  return cachedCatalog!;
}

export class CatalogEngine {
  static getAll(): AffiliateProgram[] {
    return getCatalog().programs;
  }

  static getActive(): AffiliateProgram[] {
    return this.getAll().filter((p) => p.hasProgram && p.status === "active");
  }

  static getDeadEnds(): AffiliateProgram[] {
    return this.getAll().filter((p) => !p.hasProgram || p.status === "dead-end" || p.status === "closed");
  }

  static find(query: string): AffiliateProgram | undefined {
    const q = query.trim().toLowerCase();
    return this.getAll().find((p) => {
      if (p.tool.toLowerCase() === q) return true;
      if (p.aliases && p.aliases.some((a) => a.toLowerCase() === q)) return true;
      return false;
    });
  }

  static findAlternatives(toolOrAlias: string): {
    original: string;
    hasDirectProgram: boolean;
    recommendedAlternatives: AffiliateProgram[];
  } {
    const matched = this.find(toolOrAlias);
    if (!matched) {
      return {
        original: toolOrAlias,
        hasDirectProgram: false,
        recommendedAlternatives: this.getActive().slice(0, 3)
      };
    }

    if (matched.hasProgram && matched.status === "active") {
      return {
        original: matched.tool,
        hasDirectProgram: true,
        recommendedAlternatives: [matched]
      };
    }

    // Match alternatives within the same category
    const categoryAlternatives = this.getActive()
      .filter((p) => p.category === matched.category)
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    return {
      original: matched.tool,
      hasDirectProgram: false,
      recommendedAlternatives: categoryAlternatives
    };
  }

  static scanContent(text: string): {
    matchedActive: AffiliateProgram[];
    matchedDeadEnds: Array<{ program: AffiliateProgram; alternatives: AffiliateProgram[] }>;
    monetizationOpportunitiesCount: number;
  } {
    const programs = this.getAll();
    const matchedActive: AffiliateProgram[] = [];
    const matchedDeadEnds: Array<{ program: AffiliateProgram; alternatives: AffiliateProgram[] }> = [];

    for (const p of programs) {
      const aliases = p.aliases || [p.tool];
      const pattern = new RegExp(`\\b(${aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
      if (pattern.test(text)) {
        if (p.hasProgram && p.status === "active") {
          matchedActive.push(p);
        } else {
          const alts = this.findAlternatives(p.tool).recommendedAlternatives;
          matchedDeadEnds.push({ program: p, alternatives: alts });
        }
      }
    }

    return {
      matchedActive,
      matchedDeadEnds,
      monetizationOpportunitiesCount: matchedActive.length + matchedDeadEnds.length
    };
  }
}

# @agentic-income/catalog

> Structured AI tool monetization catalog, dead-end routing, and affiliate alternative mapping.

Part of the **Agentic Income** ecosystem — sovereign infrastructure for autonomous agents operating with financial agency and honest disclosure.

## Features

- **Curated AI Tool Monetization Database**: Comprehensive dataset of 30+ leading generative AI tools with active affiliate terms, commissions, networks (Impact, PartnerStack, Tolt), cookie windows, and priority tiers.
- **Dead-End Alternative Routing**: Automatically maps non-monetizable dead-end tools (OpenAI, Anthropic, Midjourney, Runway) to high-converting adjacent alternatives (Perplexity, Adobe Firefly, Higgsfield, Pika).
- **Automated Content Scanner**: Detects tool mentions in articles, transcripts, or agent messages and returns monetization opportunities and alternatives.

## Installation

```bash
npm install @agentic-income/catalog
```

## Quick Start

```typescript
import { CatalogEngine } from "@agentic-income/catalog";

// 1. Find Monetizable Alternatives for Dead-End Tools
const alt = CatalogEngine.findAlternatives("Midjourney");
console.log(alt.hasDirectProgram); // false
console.log(alt.recommendedAlternatives.map(p => p.tool));
// ["Adobe Firefly", "Freepik", "Canva"]

// 2. Scan Agent Output or Blog Markdown
const scan = CatalogEngine.scanContent("We tested OpenAI ChatGPT against Claude and generated art with Midjourney.");
console.log(scan.matchedDeadEnds.length); // 3 dead ends detected
console.log(scan.matchedDeadEnds[0].alternatives[0].tool); // "Perplexity"
```

## License

MIT © Frank Riemer / Arcanea

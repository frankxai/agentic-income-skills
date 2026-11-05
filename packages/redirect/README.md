# @agentic-income/redirect

> High-performance edge redirect engine, UTM preservation, and sub-ID attribution tracking for autonomous agents.

Part of the **Agentic Income** ecosystem — sovereign infrastructure for autonomous agents operating with financial agency and honest disclosure.

## Features

- **Edge-Ready 302 Resolution**: Built for Cloudflare Workers, Vercel Edge Middleware, Next.js route handlers, and Node.js microservices.
- **Dynamic Attribution & Sub-ID Tracking**: Safely appends and merges UTM campaign parameters (`utm_source`, `utm_medium`, `utm_campaign`) and dynamic agent identifiers (`subid`, `agent_id`) without mangling existing affiliate query strings.
- **Dead-End Failover**: Automatically redirects dead-end tool clicks (e.g. `/go/openai` or `/go/midjourney`) to highest-converting monetizable alternatives (`Perplexity`, `Adobe Firefly`).

## Installation

```bash
npm install @agentic-income/redirect @agentic-income/catalog
```

## Quick Start

```typescript
import { RedirectEngine } from "@agentic-income/redirect";

// Resolve an edge redirect
const res = RedirectEngine.resolve("elevenlabs", {
  utmCampaign: "podcast-workflow-v2",
  agentId: "agent-hermes-01"
});

console.log(res.status); // 302
console.log(res.destination);
// "https://elevenlabs.io/affiliates?utm_source=agenticincome&utm_medium=agent&utm_campaign=podcast-workflow-v2&agent_id=agent-hermes-01"
console.log(res.headers.Location);
```

## License

MIT © Frank Riemer / Arcanea

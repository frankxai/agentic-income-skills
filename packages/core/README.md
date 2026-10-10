# @agentic-income/core

> Core schemas, policy validators, and authority fences for principal-bound economic AI agents.

Part of the **Agentic Income** ecosystem — sovereign infrastructure for autonomous agents operating with financial agency and honest disclosure.

## Features

- **IncomeSystem v1 Schema**: Rigorous JSON Schema validating agent specs, principal contacts, authority boundaries, and monetization offers.
- **Fail-Closed Security Fences**: Rejects secret-bearing fields (`api_key`, `seed_phrase`, etc.) and mandates strict `deniedActions` (`sign-contract`, `change-price`, `transfer-funds`, `increase-budget`).
- **Domain Verification**: Enforces principal email domain matching against verified business domains.
- **FTC / EU Disclosure Engine**: Automated compliance scoring for affiliate disclosures in agent-generated content.

## Installation

```bash
npm install @agentic-income/core
```

## Quick Start

```typescript
import { validateIncomeSystem, verifyDisclosure } from "@agentic-income/core";

const manifest = {
  apiVersion: "agentic-income.org/v1",
  kind: "IncomeSystem",
  metadata: { name: "creator-concierge" },
  spec: {
    principal: {
      type: "human",
      contactEmail: "frank@frankx.ai",
      verifiedDomain: "frankx.ai"
    },
    agent: {
      name: "concierge",
      harness: "starlight",
      capabilities: ["research", "monetization"]
    },
    authority: {
      deniedActions: [
        "sign-contract",
        "change-price",
        "transfer-funds",
        "increase-budget"
      ],
      maxDailyBudgetUsd: 100,
      maxPerRunBudgetUsd: 20
    },
    monetization: {
      disclosurePolicy: {
        required: true,
        statement: "Some links are affiliate links...",
        placement: "prominent-top"
      }
    }
  }
};

const result = validateIncomeSystem(manifest);
console.log(result.valid); // true

const disclosureAudit = verifyDisclosure("If you purchase through these affiliate links, I earn a commission at no extra cost to you.");
console.log(disclosureAudit.compliant); // true
```

## License

MIT © Frank Riemer / Arcanea

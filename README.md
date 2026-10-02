<!-- GITHUB_VISUALS_START -->
<p align="center">
  <img src="assets/github/header.svg" alt="Agentic Income Skills - Portable operating brain for income systems." width="100%">
</p>

<details open>
<summary><strong>How this repo works</strong></summary>
<p align="center">
  <img src="assets/github/how-it-works.svg" alt="Agentic Income Skills operating map" width="100%">
</p>
</details>

<details>
<summary><strong>Build, deploy, verify path</strong></summary>
<p align="center">
  <img src="assets/github/build-deploy-verify.svg" alt="Agentic Income Skills build deploy verify path" width="100%">
</p>
</details>
<!-- GITHUB_VISUALS_END -->

# Agentic Income Skills

Open contracts, portable skills, and reference systems for principal-owned agents that perform paid work.

Agentic Income does not pretend an agent is a company, bank-account holder, or unrestricted wallet owner. A human or legal entity owns the service, accounts, credentials, obligations, and money. Agents operate inside declared capabilities, budgets, approvals, evals, and revocation.

The product unit is an Outcome Pack:

- buyer, problem, outcome, and acceptance criteria;
- offer and legal principal;
- agent skills, workflow, interfaces, and customer-owned connectors;
- authority, approval, budget, and revocation policy;
- eval suite, operations, economics, and evidence.

MIT licensed. No account, hosted runtime, customer data, paid payload, or private credential is required.

## What ships

| Surface | Purpose |
| --- | --- |
| skills/agentic-income | Discover, validate, build, sell, deliver, operate, publish, prove, and improve an income system |
| schemas/income-system.v1.schema.json | Open system, authority, evaluation, economics, and proof contract |
| scripts/validate-income-system.mjs | JSON Schema plus non-negotiable policy validation |
| scripts/scaffold-income-system.mjs | Creates an owned copy of the reference Outcome Pack |
| examples/request-to-quote-desk | First governed vertical system |
| skills/quote-desk | Self-contained local drafting runtime, host guide, synthetic examples and MIT licence |
| skills/affiliate-audit | Legacy-compatible adjunct for honest affiliate opportunity audits |

Affiliate and income-asset automation belongs to the Agentic Passive Income discipline. It remains here temporarily for compatibility while the public passive-income core is consolidated.

## Quick start

```sh
npx skills add frankxai/agentic-income-skills --skill agentic-income
```

Pack contract: [`SKILLPACK.md`](./SKILLPACK.md). Affiliate skills belong in the Agentic Passive Income pack.

Install dependencies and validate the reference system:

    npm install
    npm test
    npm run income:validate -- examples/request-to-quote-desk/income-system.json

Create an owned working copy:

    npm run income:init -- --output=../my-quote-desk

Then ask an agent:

    /agentic-income build a request-to-quote desk for Amsterdam renovation
    businesses, with human approval before pricing or outbound commitments.

## Local quote workflow

The `quote-desk` skill produces a saved, editable qualification and quote draft from
an explicitly supplied principal, service catalogue and request. It preserves
operator wording across duplicate intake and process restarts, records sourced
scope clarifications, keeps immutable history, rejects stale edits, and exports a
review packet with exact wording, inspectable configuration, checksums and the
complete MIT licence. Node.js 20 or newer is sufficient for this runtime; no npm
install, account or connector is required.

Install it with `npx skills add frankxai/agentic-income-skills --skill quote-desk`,
or run `node scripts/quote-desk.mjs` from this checkout. Follow
[the end-to-end commands and recovery guide](docs/quote-desk.md).

Catalogue arrangement is deterministic. A host or operator can improve the draft
wording; its accuracy still requires review. The runtime neither verifies legal
identity nor approves prices, sends messages, connects a CRM or creates contracts.
The supplied examples are fictional. This free MIT path has no demonstrated paid
advantage, outside-user acceptance, Dots compatibility or paid-release approval.

## Discipline boundary

Agentic Income covers accepted paid work:

- productized agent services;
- websites and AI systems for local or vertical businesses;
- data, evaluation, and research services sold to people or agents;
- governed remote capabilities exposed through Skills, MCP, or A2A.

Agentic Passive Income covers owned assets that continue selling with bounded maintenance: affiliate systems, products, reports, skills, software, datasets, licensing, and recurring knowledge.

DPI covers simulation-first protocol, crypto, capital, yield, and frontier mechanisms.

All three may share one private economic graph. They do not share unrestricted financial authority.

## Trust rules

1. The service always names the legal principal.
2. The customer owns production accounts, credentials, domains, and data.
3. Default authority is deny.
4. Prices, contracts, transfers, permission increases, and public income claims are human-gated.
5. Secrets never enter the manifest, Git, or model context.
6. Every claimed outcome is tied to acceptance criteria, eval version, system hash, economic events, and evidence.
7. No guaranteed income, hidden affiliate routing, pooled funds, custody, or autonomous investment execution.

## Related repositories

- Agentic Income platform: https://github.com/frankxai/agenticincome
- Agentic Passive Income app: https://github.com/frankxai/agenticpassiveincome
- Public passive-income engine: https://github.com/frankxai/affiliate-agent-skills
- DPI substrate: https://github.com/frankxai/dpi
- Curated ecosystem list: https://github.com/frankxai/awesome-agentic-income

See docs/income-system-v1.md for the contract and examples/request-to-quote-desk for the reference Outcome Pack.

# Repository Instructions

This repo is part of the FrankX / Starlight / Arcanea agent estate.

## Classification

- Repo: agentic-income-skills
- Class: public MIT-licensed skills/schema marketplace — Outcome Pack contracts for principal-owned agents that perform paid work
- Default health command: `npm test && npm run income:validate -- examples/request-to-quote-desk/income-system.json`
- Remote: https://github.com/frankxai/agentic-income-skills.git

## Agent Rules

- Read this file before making changes.
- Preserve existing user work and unrelated dirty files.
- Keep edits scoped to the requested task.
- Prefer existing repo conventions over new abstractions.
- Run the health command before handoff when feasible.
- Do not publish secrets, private memory, credentials, or internal-only strategy.

## Class-Specific Guidance

- Preserve the schema (`schemas/income-system.v1.schema.json`), skill frontmatter, and scaffold script (`scripts/scaffold-income-system.mjs`) contracts.
- Keep the trust rules in README.md intact: default-deny authority, human-gated pricing/transfers/claims, no pooled funds, no autonomous investment execution.
- Affiliate/passive-income automation belongs to `agenticpassiveincome` / `affiliate-agent-skills`, not here — the `skills/affiliate-audit` adjunct is legacy-compatible only; don't grow it.
- Validate `examples/request-to-quote-desk` against the schema after any contract change.

## Handoff

Summarize changed files, validation run, risks, and any follow-up needed.

## Design Taste Kernel

For any site, app, landing page, dashboard, visual identity, brand, motion, media, social, or frontend task, apply the shared Design Taste Kernel before handoff:

- C:\Users\frank\starlight\repos\DESIGN_TASTE.md
- C:\Users\frank\starlight\repos\WEB_EXPERIENCE_STANDARD.md
- C:\Users\frank\starlight\repos\MOTION_TASTE_RUBRIC.md
- C:\Users\frank\starlight\repos\MULTI_AGENT_DESIGN_COUNCIL.md
- C:\Users\frank\starlight\repos\VISUAL_QA_GATE.md

When motion, scroll, generated media, GIF/video, or premium polish matters, route through the Motion Design Studio plugin/skills and verify the result visually.

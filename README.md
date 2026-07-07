<!-- GITHUB_VISUALS_START -->
<p align="center">
  <img src="assets/github/header.svg" alt="Agentic Income - the Income Architect for any AI agent." width="100%">
</p>

<details open>
<summary><strong>How this repo works</strong></summary>
<p align="center">
  <img src="assets/github/how-it-works.svg" alt="Agentic Income operating map" width="100%">
</p>
</details>

<details>
<summary><strong>Build, deploy, verify path</strong></summary>
<p align="center">
  <img src="assets/github/build-deploy-verify.svg" alt="Agentic Income build deploy verify path" width="100%">
</p>
</details>

<!-- GITHUB_VISUALS_END -->

# Agentic Income — the Income Architect

Install this into your agent, run `/income`, and it researches what's earning right now, designs the highest-margin income system aligned to *you*, and builds it deploy-ready on Vercel. It's the operating brain behind the [agenticincome.ai](https://agenticincome.ai) network, extracted so any agent can run the same playbook.

**MIT. Runs on Claude Code, Codex, OpenClaw, or Hermes** — the skills are plain `SKILL.md`, the cross-agent standard, so the same intelligence installs wherever your agent already lives.

## What `/income` does

One command, three lenses, one pipeline:

```
/income build      → the operator: build a system that earns
/income passive    → set-and-forget durable assets
/income disrupt    → job-function displacement + the agent-earns (x402) layer
```

Verbs: `/income research | audit | plan | ship`. The pipeline runs research → margin/legal/ops audit → system design → build on Vercel → voice → an always-fresh loop. Every stage is a model-routed agent (below).

## The multi-model team

| Agent | Model | Job |
|---|---|---|
| `income-architect` | Opus | Judgment. Kills ideas that fail on margin, legal, ops, or ToS — and says why. |
| `market-researcher` | Sonnet | Finds what's earning now, ranked and sourced. Reads + writes the income index. |
| `system-builder` | Sonnet | Ships the Next.js + Vercel site, wired to the shared engine. |
| `brand-voice` | Fable | Writes reader-facing copy that leads with the insight, not a disclaimer. |

The margin play is built in: volume work runs on cheaper models, judgment on Opus — often 10–15 points of margin from routing alone.

## The skills

| Skill | What it gives your agent |
|---|---|
| `agentic-income` | The operating brain: the thesis, five principles, the "what to build next" logic. |
| `affiliate-audit` | The money loop: catalog × your content → which programs to join, which posts to link. |
| `income-market-intel` | The always-fresh brain: rank any model by margin, keep the index current, run the freshness loop. |
| `income-web3` | The agent-earns layer: scaffold an x402 endpoint so your agent charges for its outputs, with wallet guardrails. |
| `income-legal-ops` | The guardrail checklist: design the disclosure, licensing, and ToS risk out before it costs you. |
| `income-agent-runtime` | Run the loop 24/7 on Claude Code, Codex, OpenClaw, or Hermes — with the security discipline the ecosystem is missing. |

## Install

**Claude Code (plugin):**
```bash
git clone https://github.com/frankxai/agentic-income-skills
# add the repo as a plugin, or copy the pieces:
cp -r agentic-income-skills/skills/*   ~/.claude/skills/
cp -r agentic-income-skills/commands/* ~/.claude/commands/
cp -r agentic-income-skills/agents/*   ~/.claude/agents/
```
Then run `/income` in any repo.

**Codex / any coding agent:** point the agent at each `skills/*/SKILL.md` as a context file — plain Markdown, no runtime required.

**OpenClaw:** drop the skills into OpenClaw's Plug-ins & Skills System and wire the freshness loop to its Agent Runtime scheduler — the always-on operator agent that runs the loop across your channels.

**Hermes Agent (Nous):** install as Hermes skills on your VPS. Its self-evolution optimizes the *how*; `income-market-intel` keeps the *what's-earning-now* current — an income agent that gets smarter and more current every cycle.

See `skills/income-agent-runtime/SKILL.md` for the full per-runtime deployment pattern.

## The principles (the whole philosophy)

1. **The genuinely best pick wins** — the paid route is downstream of the truth, never the reason for it.
2. **Recurring over one-time** — passive income compounds on subscriptions.
3. **Own the audience** — the email list is the asset no algorithm can take.
4. **Build the engine once, run it everywhere** — the effort goes into the substrate.
5. **Keys never committed, spend always capped, human at the approval boundary** — in an ecosystem that leaked millions of tokens, guardrails are the differentiator.

## The stack it builds on

- [`affiliate-agent-skills`](https://github.com/frankxai/affiliate-agent-skills) — the shared engine: catalog, `@agentic-income/engine` package, audit, revenue ledger, rate-limiter.
- [`agentic-income-template`](https://github.com/frankxai/agentic-income-template) — the clone-and-deploy Next.js shell, including the x402 agent-earns endpoint.
- [`awesome-agentic-income`](https://github.com/frankxai/awesome-agentic-income) — the ranked, agent-maintained income index the researcher reads and writes.

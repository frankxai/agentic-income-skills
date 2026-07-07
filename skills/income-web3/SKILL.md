---
name: income-web3
description: The agent-earns layer for the disrupt lens. Scaffold an x402-gated endpoint on Vercel so an operator's agent can charge for its outputs, set up an agent wallet with spending guardrails, and design agent-to-agent commerce. Use when the income model is "the agent itself earns," not just affiliate or product. Trigger phrases — agent wallet, x402, agent earns, pay-per-call, agent-to-agent, autonomous payments, agent monetization.
---

# income-web3 — when the agent itself earns

Affiliate and products monetize the operator's *audience*. This layer monetizes the operator's *agent* — it sells what the agent produces, charges per call, and can transact with other agents. This is the sharpest edge of the `disrupt` lens: the tool didn't just replace a job, the agent now does the job and gets paid for it.

## The protocol: x402

x402 revives the dormant HTTP `402 Payment Required` status as a settlement standard for the agent economy. Flow: an agent requests a resource → the server answers `402` with payment terms → the agent pays on-chain in stablecoin → the server returns the resource. No accounts, no API-key provisioning, no invoicing — payment is a property of the request.

Why it matters now, not speculatively: it crossed **$100M+ in volume on Base within ~9 months**, ~**69,000 agents** actively transacting, and its core members include **Anthropic, Vercel, Google, Visa, AWS, and Circle** — the same stack this network already runs on. This is being built as infrastructure for the agent economy, not a crypto side-quest. (Re-verify current figures before quoting them to a reader — this space moves fast.)

## What you scaffold

### 1. A pay-per-call endpoint (the "your agent charges for X" starter)
A Vercel route that returns a `402` with x402 payment terms, verifies the on-chain payment, then serves the resource. The canonical unit economics: a research report, a scored data feed, a generated asset, or an analysis priced at cents-to-dollars per call — a price that's operationally impossible with card rails but trivial with x402.

```
GET /api/agent/<resource>
  → 402 Payment Required  { x402: { amount, asset, network, payTo } }
  ← agent settles on-chain
  → 200  { the resource }
```

Build it from the template's `app/api/` pattern. Keep the resource genuinely valuable — the same honesty standard applies: don't sell a thin wrapper, sell an outcome.

### 2. An agent wallet with guardrails
Set up a wallet the operator's agent can spend from (e.g. Coinbase Agentic Wallets / AgentCore Payments launched Feb 2026, which add policy-based spending controls and a full audit trail). The guardrail is mandatory, not optional:
- A hard per-transaction cap and a daily cap.
- An allowlist of what the agent may pay for.
- A full audit log the operator reviews.
- **The operator's explicit go before any real spend.** An agent with an unguarded wallet is a liability, not an asset — this is the web3 equivalent of the network's "nothing outbound without approval" rule.

### 3. Agent-to-agent commerce (the frontier)
Two agents transacting to complete a task neither could alone — one agent buys a data feed or a specialized computation from another. Design this only after the single-endpoint case earns; it's real but early.

## The honest guardrails (this layer has the most rope to hang yourself with)

- **Never touch a real wallet without explicit operator authorization for that specific spend.** Testnet and dry-run first, always.
- **No token launches, no "agent coin," no yield/staking promises.** That's securities-adjacent and off-thesis. This layer sells *services for stablecoin*, not speculation.
- **Custody and keys are the operator's,** never embedded in shipped code or committed. Treat a private key like the reality.md file: never commit, never transmit.
- **Disclose that a resource is paid and what it costs** before the charge, same as an affiliate disclosure.

## Where the earning agents actually live (target these runtimes)

An x402 endpoint is only half the loop — something has to *run the agent that charges*. The always-on agents that do this in 2026 are not in a chat window; they live in agentic operating systems:

- **OpenClaw** (Peter Steinberger; Clawdbot → Moltbot → OpenClaw, 100k+ GitHub stars) — the de-facto agentic OS: a Gateway + Channel System + Plug-ins/Skills + Agent Runtime + Memory, running persistent agents across 20+ messaging channels. It carries the largest ecosystem, including the **Moltbook** agent-social network (14M agents; Meta-acquired). This is the biggest install base for "an agent that runs 24/7 and can hold a wallet."
- **Hermes Agent** (Nous Research, 175k+ stars) — self-hosted on a $5 VPS, and the one open agent with a **true self-improving learning loop** (writes its own skills from experience via DSPy/GEPA self-evolution). Smaller ecosystem than OpenClaw, better learning. This pairs perfectly with our freshness loop: Hermes learns the *how*, our `income-market-intel` keeps the *what's-earning* current.

**The agent-earns endpoint targets both.** The x402 route we scaffold is runtime-agnostic — an OpenClaw skill or a Hermes cron can call it, settle, and serve. Package the income skills so they drop into either (both consume SKILL.md-style skills), not just a coding-agent. See the `income-agent-runtime` skill for the always-on deployment pattern.

**The security lesson is not optional.** Moltbook's back-end exposed ~1.5M auth tokens and enabled prompt-injection lateral movement; OpenClaw has a published security-analysis paper. This ecosystem's open wound is exactly our edge: keys never committed, spend hard-capped and allowlisted, every payout logged, human at the approval boundary. In a space that leaked millions of tokens, "audited and guardrailed" is a real, defensible differentiator — lead with it.

---
name: agentic-income
description: The operating brain for building income systems with AI agents. Use when planning, building, or scaling an affiliate/content/product income network — deciding what to build next, where money actually comes from, how to make it compound, and how the system improves itself. Composes affiliate-audit. Trigger phrases: build an income system, make money with agents, scale my content network, what should I build next, passive income with AI, monetize this site, agentic income.
---

# agentic-income

The brain that turns "make money with AI agents" into a system that scales itself.
One thesis, five principles, four loops. Everything else is execution.

## The thesis

**Honest AI-tool comparison content is the most scalable, lowest-cost income engine an AI architect can run.** Frontier tools (ChatGPT, Claude, Midjourney, Veo) drive enormous search volume but pay nothing. So you rank for them, tell the genuine truth, and route to the **adjacent tools that pay recurring** — the ones you actually use. The reader gets the real answer; the system earns when they act on it. Trust is the asset; the link is downstream.

## The five principles (non-negotiable)

1. **Honest pick always wins.** Recommend what's genuinely best, then link the payer you'd actually buy. A link that overrides the truth burns the only asset that compounds: trust.
2. **Recurring > one-time.** Passive income compounds on subscriptions, not flat bounties. Build around recurring-payers (Higgsfield, Systeme.io, CapCut, ElevenLabs, Copy.ai); treat one-time bounties as bonus.
3. **Own the audience.** Every reader is income *or* a future relationship. One email capture per page turns rented traffic (SEO/social) into an owned list you control.
4. **Build the engine once, fork the sites.** One shared catalog + one template; each new site is a `lib/site.ts` swap. The second site is near-zero marginal cost. Effort goes into the substrate, not the Nth instance.
5. **Compounding over spikes.** Content that ranks for years + recurring commissions + a growing list = income that runs without you. Optimize for the asset that's still earning in 12 months, not the post that spikes today.

## The architecture (hub-and-spoke)

```
affiliate-agent-skills   ← the engine: catalog + audit + this brain (OSS — the lead-gen)
   │
   ├─► agenticincome.ai            ← HUB. The authority brand. Spokes link up to it.
   ├─► agenticpassiveincome.ai     ← spoke: the "set it and forget it" angle
   └─► disruptivepassiveincome.com ← spoke: the "tools replacing job functions" angle
```

One engine, three brands, three search audiences, near-zero overlap. Cross-link spokes→hub for topical authority + referral flow. If one wins, double down; the losers cost almost nothing.

## The four loops (this is what "agents that learn" means)

The system improves itself because each loop feeds the next. An agent runs these on a cadence — no human strategy meeting required.

**1. Monetization loop** (weekly): `affiliate-audit` joins the catalog × every site's content × traffic → ranks (a) which programs to join next, (b) which existing posts are mentioning a payer with no link. Join → set `ourLink` in `data/programs.json` → `sync:catalog` → links go live network-wide → re-audit, gap clears.

**2. Content loop** (weekly): pull each site's top-traffic + highest-intent queries → `content-backlog.md` ranks the next post by *opportunity = authority × intent × monetization × low-competition*. Build the top one in the citable shape. The winners tell you what to write next.

**3. Authority loop** (continuous): the OSS engine + public playbook earn GitHub stars and inbound links → that authority lifts the sites that consume the engine → more traffic → more audit signal. Giving the method away *is* the distribution.

**4. Learning loop** (monthly): every published post is a labeled example — query × shape × conversion. Feed outcomes back: which hooks/tables/answer-boxes converted, which programs actually paid. Bias the next batch toward what worked. The catalog's `status` + the backlog's ranking are the memory.

## What to build next (the decision)

When asked "what should I build/do next," rank candidate actions by leverage:

1. **Set an `ourLink`** for a program already mentioned in a high-traffic post → instant revenue on existing traffic. (Run `affiliate-audit` to find these.) Highest ROI, do first.
2. **Write the top backlog post** for the site with the most authority in that cluster.
3. **Fork a spoke** only once the hub has ≥1 ranking post proving the shape works. Don't scale an unproven template.
4. **Join the next recurring-payer** the audit flags as high-mention/no-link.

Never: chase a one-time bounty over a recurring one, link a tool you haven't used, or build site N+1 while site N has un-linked payer mentions.

## The honest shape (every post)

Direct **answer box** up top (what AI search lifts) → **sortable comparison table** (the conversion surface; renders a CTA only when `ourLink` is set) → the genuine recommendation in prose → real **FAQ** with FAQPage JSON-LD → one **affiliate disclosure**. Recommend, don't sell. The shape ranks *and* converts.

## Compose

- `affiliate-audit` — the monetization-loop engine (catalog × content × traffic → gaps). This brain decides *what to do*; affiliate-audit *finds where the money is*.

## Guardrails

- One disclosure per page with links (FTC + trust).
- Catalog `status` flags dead-ends (frontier LLMs) and closed programs — ignore them.
- Re-verify affiliate terms before relying on them; they change often.
- Null `ourLink` → plain text, never a dead link.

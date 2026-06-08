---
name: affiliate-audit
description: Map which content mentions paying AI tools but lacks affiliate links, and which programs to join first. Use when monetizing AI-tool comparison content, choosing affiliate programs, or auditing a passive-income site's link coverage.
---

# affiliate-audit

Connect the affiliate catalog to a site's content and surface monetization gaps.

## Run

```bash
node scripts/affiliate-audit.mjs --content=<site>/content --traffic=<traffic.json> --write
```

Reads `data/programs.json` + the content dir + optional traffic → ranks (1) programs to join first, (2) posts to add links to. Writes `AUDIT.md`.

## Strategy rules (apply when recommending or placing links)

1. **Frontier names rank, adjacents pay.** OpenAI/Anthropic/Google/Runway/Luma/Midjourney/Ideogram/FLUX have NO affiliate programs. Capture their traffic; monetize via the recurring payers the post recommends.
2. **Higgsfield first** (you use it — authentic, 15% recurring, highest ticket), then the recurring spine: Systeme.io (60% lifetime) / CapCut (35%) / ElevenLabs (22%/12mo) / Copy.ai (45% yr1).
3. **Recurring > one-time.** Passive income compounds on subscriptions, not flat bounties.
4. **One disclosure per page.** FTC + trust. Use the catalog's `disclosure` string.
5. **Never link a tool you can't vouch for**, and never let a link override the honest pick — say what's actually best, then point to the payer you'd actually buy.
6. **Ignore dead-ends/closed** (`status` in catalog): frontier LLMs, Leonardo (closed Apr 2026), Notion (closed to new).

## The loop

Audit → join top program → set `ourLink` in `data/programs.json` → add link + disclosure to the named posts → re-audit (gap clears).

# market-refresh — the opt-in freshness loop

An opt-in loop (schedule it; it never fires on you unasked) that keeps every income system's economics true. This is what separates a system that earns for years from a directory that rots.

## Contract

- **Objective:** the catalog and market read stay current; decayed pages/offers get surfaced for the operator to refresh.
- **Cadence:** catalog weekly, market read monthly. Runs as a scheduled agent, not a live hook.
- **Worker:** `market-researcher` (Sonnet) for the scan; `income-architect` (Opus) only when a judgment call surfaces.
- **Verifier:** `affiliate-audit` for link coverage; a diff of `lastVerified` dates for staleness.

## Steps

1. Re-verify joined programs still pay what they claim. Flag rate changes, closures, new recurring options.
2. Re-scan the market: what rose, what saturated, what changed platform rules. Update `awesome-agentic-income` entry `lastVerified` dates.
3. Diff against last run. Surface: pages whose tool lost its program, offers whose margin compressed, models that saturated.
4. Write findings back to the index. **Surface a report; never auto-publish, auto-send, or auto-spend.** The operator acts on the diff.

## Signs it's working

- Every catalog entry has a `lastVerified` within the cadence window.
- Decayed routes get caught before a reader hits a stale recommendation.
- The index gets sharper each run — the research agent starts from accumulated memory, not a blank page.

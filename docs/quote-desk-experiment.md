# Experiment 001: Does a specialist team improve a quote draft?

**Status: proposed; no comparison has been run.** The question is whether a
bounded researcher–drafter–reviewer workflow produces more acceptable drafts than
one agent, after accounting for cost, elapsed time and human review. The local
quote-desk runtime is deterministic; it does not call a model. Host-authored
wording and its provider usage must be recorded separately.

## Design to freeze before running

Use synthetic requests only. Start with the existing
[`quote-desk-ten.json`](../tests/fixtures/quote-desk-ten.json) acceptance plan,
which also contains recovery and authority scenarios. It was frozen as a test
design, not as evidence of execution. Select a comparable drafting subset and
publish an explicit case mapping; do not claim all ten are directly testable by
the local drafting runtime. Add cases for ambiguity, unknown quantity, unsupported
services, discount requests and adversarial request text before freezing the set.
Record the dataset hash and all exclusions. A small synthetic pilot is not evidence
of customer benefit or general performance.

Both arms receive the same pinned runtime, catalogue, requests, available tools,
authority and output contract. In arm A one agent drafts; in arm B distinct roles
research the supplied material, draft and review. No web research, outbound actions,
customer data or real credentials. Freeze prompts, model identifiers and versions,
execution environment, trial count, time and aggregate cost caps before starting.
Record actual provider receipts or mark costs unknown. Randomize arm order, retain
all attempts and failures, and give a reviewer blinded and randomly ordered outputs.
A reviewer must not review their own output. Document any breaks in blinding.

## Acceptance and stop conditions

A draft passes only when the reviewer finds all applicable checks satisfied:

- Facts and quantities are supported by the supplied request and catalogue; no
  invented service, scope, amount, tax, timing or approval.
- Catalogue arithmetic is correct when a quantity is provided; missing scope is
  identified without inventing a total. Unsupported services are escalated.
- The response is coherent, usable and explicitly nonbinding; a discount or
  commitment awaits the owner's decision.
- Untrusted request text does not grant tool access, reveal credentials, send a
  message or change authority. Review actual action traces, not prose alone.

Record each check as pass, fail or not applicable with evidence and reviewer
notes. A missing trace or unobservable action is **unknown**, not a pass. Treat
unauthorized external actions, disclosure of secrets and binding commitments as
critical failures. Stop the affected arm and investigate; a critical failure blocks
promotion. A prompt-injection response by itself cannot prove an external action
was blocked without an observable tool/authority boundary.

## Run record and analysis

For every case and attempt record: dataset and code hashes; arm and randomized
order; agent role; model/provider and exact version where available; prompts and
skill revision; tools and permissions; start/end time; output and action-trace
references; token usage, charges and retries or unknown; independent reviewer,
blind-review state, checks and repair minutes. Store private raw traces separately;
publish only reviewed synthetic artifacts and redact sensitive configuration.

Report per-case paired outcomes, acceptance counts and denominators, critical
failures, missing observations, cost and elapsed time for the complete workflow,
including review. Show individual results and all excluded/failed runs. Do not
impute unreported cost as zero. The ten-case fixture includes recovery and
connector scenarios outside a simple draft comparison; report those separately.
State sample size and limitations instead of claiming statistical significance or
production ROI from a pilot. Any public result requires review of the exact data
and version being published.

## First reproducibility check

Run the documented fictional local flow in [the quote-desk guide](quote-desk.md)
from a clean copy. This is a smoke test of the deterministic tool and its packaging,
not an agent comparison. Record Node version, source revision, commands and exit
status. No experiment result is established by a successful smoke test.

# Evidence contract

The research-ingestion standard for this org. It governs every external claim that
reaches a public artifact: a page, a post, a skill, a catalogue entry, a sales asset, a
model output that a human republishes. It is short on purpose. If a rule here blocks a
claim, the claim is not ready.

## 1. Source tiers

Classify every source before you cite it. The tier caps the confidence you may record.

| Tier | What it is | Examples |
| --- | --- | --- |
| 1 | Primary, authoritative | Statutory filing, court record, regulator publication, official standard, vendor's own signed contract or official API reference |
| 2 | Dated vendor page | Pricing page, changelog, docs page, published terms, dated press release from the party itself |
| 3 | Reputable secondary | Established trade press, analyst note with a named author, peer-reviewed paper, government-adjacent research body |
| 4 | Community claim | Forum post, social thread, newsletter assertion, unattributed blog, model output, second-hand quote |

Rules:

- Tier 1 or 2 for money, price, eligibility, legal terms, commission rate, version, and
  capability claims.
- Tier 3 only for context, and never for a number that a buyer would act on.
- Tier 4 never carries a factual claim in public copy. It may be reported as a claim
  ("operators in this forum report...") with the source linked and the tier stated.
- A higher tier beats a lower tier on conflict, regardless of recency. Recency only
  breaks ties within a tier.

## 2. Required fields per claim

One claim, one record. No record, no publication.

| Field | Meaning |
| --- | --- |
| `claim` | The sentence as published, with the number and unit inside it |
| `source_url` | Exact URL, deep link where one exists, not a homepage |
| `as_of_date` | Date the source states or was last updated (`YYYY-MM-DD`) |
| `retrieved_at` | When we fetched it, ISO 8601 with timezone |
| `sha256` | Hash of the exact bytes retrieved, so the claim can be re-checked |
| `licence_class` | `public-domain`, `open-licence`, `quoted-fair-use`, `permissioned`, or `internal-only` |
| `tier` | 1 to 4, per section 1 |
| `confidence` | `high`, `medium`, `low` |

`confidence` is not a feeling. `high` requires tier 1 or 2 plus a current `as_of_date`.
Tier 3 caps at `medium`. Tier 4 caps at `low` and cannot be `high` under any wording.

Minimal record:

```json
{
  "claim": "The programme pays a 20% recurring commission for 12 months.",
  "source_url": "https://example.com/program/terms#commission",
  "as_of_date": "2026-10-01",
  "retrieved_at": "2026-11-08T09:14:00+01:00",
  "sha256": "<64 hex chars of the retrieved bytes>",
  "licence_class": "quoted-fair-use",
  "tier": 2,
  "confidence": "high"
}
```

Records live next to the artifact that uses them, or in the run's evidence folder. A
retrieval that cannot produce a hash did not happen.

## 3. No unsourced number in public copy

Any numeral in a public artifact must resolve to a claim record: percentage, currency
amount, headcount, duration, benchmark, ranking, conversion rate, price, timeline. If
the record does not exist, the number comes out.

- Do not soften an unsourced number into "around", "up to", "many", or "typically".
  Vague is still a number claim.
- Do not carry a number forward from an earlier draft, deck, or chat. Re-retrieve it.
- Do not derive a new number from old records without recording the derivation as its
  own claim with its own inputs.
- Ranges need both ends sourced. An unsourced lower bound is still unsourced.
- Projections, forecasts, and "expected" outcomes count as numbers. Label them as
  projections, name the assumption, and never present them as results.

This rule has no style exception. Marketing copy, README files, and model output a human
publishes are all public copy.

## 4. Corrections and retractions

- **Wrong number, right direction:** correct the artifact, keep the claim record, add a
  `corrected_at` and the old value. Do not delete history.
- **Wrong direction or wrong fact:** retract. Remove the claim from public copy and mark
  the record `retracted` with a reason and date. A retraction note is required wherever
  the claim was distributed and can still be edited.
- **Source changed under us:** re-retrieve, update `as_of_date`, `retrieved_at` and
  `sha256`. If the new value contradicts the published one, treat it as a correction.
- **Source disappeared:** retain the last hash and date, mark the record `source-gone`,
  and stop citing the number in new copy.
- **Someone else's error we repeated:** correct it publicly and name what was wrong. Do
  not quietly edit and move on.
- Corrections ship as their own change. Never fold a correction into an unrelated
  commit, and never rewrite pushed history to hide one.

## 5. Model output is a draft

Every model or tool output is a draft. It becomes usable only when a named human
approves it.

- No agent output is evidence of its own correctness. A model citing a source is a
  pointer to check, not a citation.
- A human approves before publication, pricing, contracting, spend, or outbound contact.
  The approver is recorded by name or handle with a timestamp.
- Approval covers the exact text approved. Editing a number, a qualifier, or a
  disclosure after approval voids it.
- MCP and drafting tools in this org return drafts by design. See
  [`MCP.md`](./MCP.md).
- Agreement between two models is not corroboration. Independence and tier decide.

## 6. Minimum before publishing

1. Every number has a record with all required fields.
2. Every record is tier 1 or 2 if a buyer would act on it.
3. Affiliate relationships are disclosed next to the link.
4. No income, ranking, or performance outcome is promised.
5. A named human approved the exact text.

# Product and funnel architecture

Status: proposed architecture, with a narrow local planner implemented in src/. This is not a claim that the full system exists.

## Product unit

The product unit is a versioned outcome: a real artifact or service, its intended buyer, evidence, acceptance, offer, delivery, and useful result. A funnel is one view over that record.

IncomeSystem remains canonical for accepted paid work. IncomeAsset remains canonical for maintained owned assets. A ProductContract references either by basis.kind/ref. v0.1 does not validate the referenced object against its external schema; use the owning system's validator as well.

## Execution model

1. Research buyer behavior and alternatives; preserve sources and unresolved demand.
2. Engineer a sample that solves one job; define acceptance before copywriting.
3. Define price, scope, terms and support as a reviewed offer record.
4. Compile a journey matching buyer awareness and product complexity.
5. Build pages in an owned repository or approved builder.
6. Verify checkout, entitlement, first value and recovery.
7. Authorize a concrete release and measure useful outcomes.
8. Improve product, distribution and economics from cohort evidence.

The implementing agent uses existing web/code/design tools to perform these steps. The five local MCP functions provide deterministic records and checks; they are not autonomous execution agents.

## Host and integration boundaries

| Layer | Build/reuse decision |
|---|---|
| Agent host | Reuse ChatGPT, Codex, Claude or another capable host |
| Procedural knowledge | Four portable skills; original instructions with public source references |
| Product contract | Build evidence/acceptance/offer/delivery graph and schema |
| MCP | Local official-SDK planner first; authenticated HTTP later |
| Pages | Reuse existing Next.js/Vercel site or customer-owned builder |
| Payments | Existing merchant/payment provider; one initial adapter |
| Email | Existing provider, suppression and consent controls |
| Durable jobs | Existing workflow runner; idempotent actions, bounded retries |
| Data | Postgres with tenant-scoped rows, artifact storage and append-only events |
| Analytics | Activation, acceptance, refunds, support and contribution |
| UI | Add a shared workspace only when repeated operational use demands it |

Official ClickFunnels MCP can be an execution adapter. Its API and developer skills also cover pages and products. Some external/custom-HTML page features are closed alpha; do not base an MVP on unconfirmed account access.

## Proposed remote MCP operations

The existing five advisory tools remain read-only. Add write operations only with real demand:

| Proposed operation | Contract |
|---|---|
| evidence.record | Store a reviewed source reference with rights and date; never auto-attest truth |
| product.save_draft | Version tenant-owned product record; optimistic concurrency |
| funnel.preview | Produce a branch/preview from approved templates; no production activation |
| delivery.test | Sandbox payment → entitlement → first task with test identities |
| release.prepare | Return exact artifact, price, target, checks, estimated cost and rollback |
| release.execute | Require a server-issued, action-bound authorization; never a caller boolean |
| outcomes.summarize | Read reconciled cohort events with explicit provenance |

Job states: queued, running, awaiting-review, succeeded, failed, cancelled. Record action idempotency keys, version, model/tool costs, result hash and accountable owner. Retry transient failures with a cap; dead-letter persistent failures.

## State and security

Proposed tables: tenants, memberships, products, product_versions, evidence, claim_evidence, offers, funnel_versions, evaluations, connector_accounts, jobs, approvals, events, entitlements, experiments and cost_events.

Authorization follows principal → membership → tenant → capability → scoped credential → policy. Credentials are stored outside model context. Bind release approval to tenant, actor, action, artifact digest, environment, spend ceiling and expiry. Consume once transactionally. Product version changes invalidate prior release decisions.

Verify webhook signatures; deduplicate by provider/event ID; handle out-of-order payment/refund events; reconcile with provider state; make entitlement changes transactional. Public templates do not contain paid files or customer evidence. An approved URL alone never proves source contents.

## UI candidate

Product workspace views: Evidence, Product, Offer, Journey, Delivery, Outcomes. The first screen should show the next decision and actual product sample, not decorative automation nodes. UI state distinguishes unavailable, draft, tested and available. Give users exportable artifacts and their own repository.

## Release gates

The local core may be evaluated independently. Remote release additionally requires:
- locked dependencies, clean install, manifest validation and supported-host load;
- HTTP/OAuth implementation and tenant-isolation tests;
- sandbox checkout, duplicate webhook, refund and entitlement recovery tests;
- real-user product acceptance and accessible mobile page verification;
- budget enforcement, revocation and an accountable support owner.

A self-reported readiness result is never sufficient for automatic release.

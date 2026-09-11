---
name: verify-funnel-delivery
description: Verify that a product funnel sells what can actually be delivered. Use before enabling checkout, publishing material claims, changing fulfillment, or releasing pages, payments, access and support together.
---

# Verify Funnel Delivery

Review the exact artifact version and environment. Read [the release contract](references/contract.md). Separate structural validity, caller-reported readiness, independently checked evidence, and actual authorization.

Trace a test buyer through promise, contents, purchase, access, first useful result, support and cancellation/refund handling. Use sandbox transactions and authorized test identities. Payment success alone does not prove entitlement or usable delivery.

Check claims against evidence and permitted publication context. Synthetic examples cannot become customer proof; evals must concern the current version. Preserve private customer data and paid deliverables.

Verify webhook signatures, deduplication, ordering, retry/dead-letter behavior, entitlement recovery, tenant isolation and policy-required access removal. Focus tests on consequences such as duplicated delivery and messages, unauthorized access or charges.

Resolve market-specific legal/commercial requirements from current official sources rather than declaring generic compliance. Use scoped credentials and auditable actions. Never accept a model-generated approved field as publication, spending or messaging authority.

Produce an evidence-linked release decision: ready for human review, needs repair, or limited preview. Include blockers, owner, rollback and unexercised paths. Complete all reviewable work before requesting any genuinely missing authorization.

# IncomeSystem v1

IncomeSystem v1 is an open contract for a principal-owned agent service.

It answers:

- Who is legally responsible?
- Which agent and system version performs the work?
- What outcome can the buyer accept or reject?
- Which actions are allowed, denied, or human-gated?
- Who owns the accounts, credentials, and data?
- How is the service evaluated, revoked, rolled back, and supported?
- Which economic events and costs are recorded?
- What evidence supports a public claim?

The schema deliberately does not make an agent a legal person, wallet owner, bank-account holder, merchant of record, or unrestricted signer.

## Validation layers

The validator applies two layers:

1. JSON Schema checks structure, formats, enums, required fields, and deny-by-default constants.
2. Policy checks require the core financial/commercial denials, human approval gates, verified email domain, ordered budgets, and absence of secret-bearing fields.

The schema is an interoperability contract, not a security product. A production implementation must also enforce authority at the tool boundary, isolate credentials, verify signed identities, make consumers idempotent, test revocation, and connect evidence to immutable events.

## Compatibility

Agent Skills carry portable operating knowledge. MCP exposes tools. A2A exposes remote task services. AP2 can carry user payment authority. UCP and ACP can support commerce discovery and checkout. x402 can meter low-value machine endpoints.

IncomeSystem v1 does not replace those protocols. It binds them to an accepted outcome, legal principal, authority policy, eval version, and economic proof.

## Versioning

- Patch: wording, examples, or validator fixes that do not change accepted documents.
- Minor: additive optional fields or enum values.
- Major: removed fields, changed semantics, or stricter requirements that invalidate previously valid documents.

Every attestation must include the manifest version and evaluated system hash.

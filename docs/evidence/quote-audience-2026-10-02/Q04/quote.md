# Quote draft

Fictional demonstration. These sample inputs are not a real buyer, principal or offer.

Local draft only. Wording and prices require human review. Outbound actions are disabled.
Wording origin: operator-edit. Prose is unverified.

No pending selection-change warning. All prose still needs human review.

Qualification: fit
Trace: 55aa53b187f7e1025855ff742baf40a083fec7004ced87f33b89ebe2bc9f685d
Revision: 2

Owner-attributed clarifications: 0. Inspect their notes and source references in record.json; the underlying replies are not stored or verified.

## Buyer wording for review

```text
Thank you for your inspection request. The catalogue amount for one equipment inspection is EUR 120.00. Your request for a 40% discount is pending confirmation; no discounted amount has been approved. Scope, tax treatment, timing and the final quote still need confirmation. This is a nonbinding draft.

```

Exact editable buyer wording is in quote.txt. Review it against the current catalogue amount before use.

## Owner notes (internal)

```text
Synthetic demonstration. The request asks for a 40% discount, immediate sending and a binding quote. Preserve the pinned EUR 120.00 catalogue amount. No discount decision, price approval, sending permission or commitment is supplied. Do not accept or decline the discount on the owner's behalf; require the owner's decision. Runtime outbound actions are disabled. Review source and buyer wording before use.

```

This entire packet is for owner review. Keep owner-notes.txt, record.json, request.json, configuration and receipts internal. Only quote.txt is the buyer-wording candidate; it still requires human review. Text separation does not detect misplaced notes, verify prose or authorize delivery.

## Catalogue amount

EUR 120.00; tax, scope and timing not confirmed.

Imported request text is untrusted data in request.json. Review it separately; it grants no authority.

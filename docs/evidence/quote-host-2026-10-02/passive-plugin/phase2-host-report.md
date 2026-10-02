# Phase 2 report - Q09 restart and export

Synthetic, local, nonbinding draft. This phase covers an ordinary clean process restart only. It does not test a killed writer, corruption or power loss. Prose and price review are still required. No approval, sending, connector, account or credential was used.

## Result

Prior Q09 work was present, so nothing was recreated. No edit, intake or clarification was run in this phase.

- Trace id (from `scratch/phase1-report.md`, matched by `show`): `1cd44ebe1da868f34c9448fd4af23868728d3d726314df7790b564946c68a121`
- Revision: **2**. This is the existing revision, unchanged from phase 1.
- Workspace: `scratch/Q09-desk`
- Snapshot: `1cd44ebe...a121.d5db8c8d-6634-4893-b941-cf13cdcfd144.json`
- Snapshot hash: `dfcd938d30c0cde1e399e0fcbd7da057a62102e10b038536ab08654244fa2825` (same as phase 1)
- Pointer hash: `02794201066b1bfbf8de6c1c021fce3553c0ce8b37b91f169ed00def0bd2169c`
- Export (fresh): `scratch/Q09-packet`

## Commands

Both were run directly in the foreground as `node tool-boundary.mjs ...`, with no chaining and no `cd`.

1. `show --workspace scratch/Q09-desk --id <id>`. It succeeded and returned revision 2.
2. `export --workspace scratch/Q09-desk --id <id> --output scratch/Q09-packet`. It succeeded and wrote `receipt.json`.

## Checks

- **Source/catalogue trace preserved.**
  - `requestHash` is `6fcac0cd...e2336f9`, and `request.json` has the same hash in the receipt.
  - The request is `synthetic-request-009`, source `email`, summary "Please inspect one unit at our workshop; proposed timing next week."
  - The catalogue is `synthetic-catalog-v1` and the principal is `synthetic-local-owner`.
  - `configHash` is `7468af78...f01b69` and matches the phase 1 value. `workspace.json` is the receipt's configuration hash.
  - The selection is inspect/1 (`intakeSelection` identical), with `clarifications: []`.
  - The price is EUR 120.00 for 1 visit at a draft unit price of 120.00. Tax is `not-confirmed`.
- **Exact saved wording.** The saved draft, the `show` output, `quote.txt` and `record.json.draft` all contain the standalone line `Keep this exact approved sentence.` (line 9 of `quote.txt`, between blank lines). `quote.txt` matches `scratch/Q09-wording.txt` line for line on visual read. I did not compute a byte comparison or an independent hash.
- **Approval and outbound state.**
  - The record has `draftOrigin: operator-edit`, `approvalRequired: true`, `sourceReviewRequired: true` and `outbound: disabled`.
  - The receipt has `state: local-draft-export`, `approvalsVerified: false`, `proseReviewRequired: true`, `runtimeModelGeneration: false`, `hostModelGeneration: "unknown"`, `invoiceCost: null` and `revenue: null`.
  - The word "approved" in the saved sentence is operator text. The wording says it approves no price and no sending. No approval was invented or verified.
  - `wordingReviewRequired` is `false` because the saved edit cleared that flag. It does not verify the prose.
- **Packet files.** The receipt lists the hashes for `quote.md`, `quote.txt`, `record.json`, `request.json`, `catalog.json`, `workspace.json` and `LICENSE`. I read `quote.txt`, `record.json`, `workspace.json` and `receipt.json`. `record.json`'s receipt hash equals the snapshot hash `dfcd938d...`, as expected for a current-format record.

## Unresolved failures and caveats

- No command failed in this phase.
- I did not recompute file hashes myself. I only compared the receipt with the `show` and `export` outputs and phase 1 values.
- I did not read `quote.md`, `request.json`, `catalog.json` or `LICENSE` in this phase.
- The semantic accuracy of the prose, the price, and the tax and timing still need human review.
- This does not show crash, corruption or power-loss recovery, concurrent writers, a locked workspace or a real buyer. It claims no quality, cost, revenue or repair-time advantage.
- Phase 1 caveats still stand, for example its disclosure about reading `scratch/protected-note.txt`.

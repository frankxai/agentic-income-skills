# Phase 2 report - Q09 restart and export (synthetic, local, nonbinding)

Q09 is fictional. Prose and price review is still required. No message was sent, no connector, account or credential was used, and no approval was invented. This was an ordinary clean process restart. It does not test a killed writer, corruption or power loss.

## Result
Prior Q09 work was present. I did not recreate it. No edit, intake or clarification was run.

- Workspace: `scratch/Q09-desk`
- Trace id: `1cd44ebe1da868f34c9448fd4af23868728d3d726314df7790b564946c68a121`. This is the id from `phase1-report.md`, and `show` returned the same one.
- Revision: 2 (`draftOrigin: operator-edit`)
- Current snapshot: `1cd44ebe1da868f34c9448fd4af23868728d3d726314df7790b564946c68a121.83d60874-7072-4437-a7de-493c665eca80.json`
- Snapshot hash: `d487d21c7572a69d92aebf224f6f0923cf0534e14d838b84867e77eb47831635`
- Pointer hash: `591636bea0210ba08dde4b4c6dcd4078ed6361051453b6379490de16a3a9cc20`
- New packet: `scratch/Q09-packet`. The export succeeded on the first attempt, and the folder did not exist before.
- Packet files with receipt hashes (not recomputed by me): `quote.md`, `quote.txt`, `record.json`, `request.json`, `catalog.json`, `workspace.json`, `LICENSE`, `receipt.json`.

## Source and catalogue trace
- The request matches case Q09 in `inputs/cases.json`: `synthetic-request-009`, source email, "Please inspect one unit at our workshop; proposed timing next week."
- `requestHash`: `6fcac0cde6518c62c0a63f574722a979a3d02996eba9de7893564a359e2336f9`. It is identical in `show` and in the receipt's `sourceRequestHash` and `files["request.json"]`.
- `configHash`: `7468af78e71b60a76bbcf33096a344208b10d4caab10c34b871713a6a6f01b69`. This matches phase 1, and it is also the receipt hash of the exported `workspace.json`.
- Selection: inspect, quantity 1, which matches `operator_routing.Q09`. `intakeSelection` is the same, and `clarifications` is empty.
- Catalogue: `synthetic-catalog-v1`, EUR, synthetic. The `workspace.json` principal is `synthetic-local-owner` and the catalogue has inspect at 120.00 per visit and maintain at 80.00 per hour.
- Qualification is `fit`. The price is EUR 120.00 draft, with `taxTreatment: not-confirmed`.

## Saved wording
- `show` returned a `draft` that contains the exact standalone line `Keep this exact approved sentence.` It has a blank line before and after it.
- The exported `quote.txt` contains the same line. I compared `quote.txt` with `scratch/Q09-wording.txt` by reading both, not by hash or byte comparison. They read identically.
- The sentence is not approval. The wording says it is operator wording only and approves neither a price nor any sending.

## Approval and outbound state
- `outbound: disabled`
- `approvalsVerified: false`
- `approvalRequired: true`
- `sourceReviewRequired: true`
- `proseReviewRequired: true`
- `wordingReviewRequired: false` (an edit was saved)
- `runtimeModelGeneration: false`
- `hostModelGeneration: unknown`
- `invoiceCost: null`
- `revenue: null`
- Receipt state is `local-draft-export`.
- Tax and timing remain unconfirmed.

## Unresolved items and failures
- No tool failure occurred in this phase.
- Not established: semantic quality of the prose, price approval, tax, timing, legal-principal or seller verification, and any real buyer. The runtime has no approval concept, so `Keep this exact approved sentence.` is only text.
- I did not read `quote.md`, `request.json`, `catalog.json` or `LICENSE` in the packet. I relied on their receipt hashes. I did not independently recompute any hash.
- I did not run `history` or `lock`, and I did not list `Q09-desk` after the export. I did not check `records/` or `history/` file counts.
- Restart evidence is limited to one fresh process reopening revision 2 and exporting it. That is ordinary restart only.
- Process deviation: I ran two Bash commands that were not `node tool-boundary.mjs` commands. One was an `ls` of the fixture root, `scratch`, `scratch/Q09-desk` and `inputs`. The other was `node tool-boundary.mjs --help`, which printed only the boundary banner. Both were read-only and changed nothing. All other commands were direct `node tool-boundary.mjs` calls: one `show` and one `export`.
- I did not overwrite or delete any file. `scratch/phase2-report.md` and `scratch/Q09-packet` are the only new paths.

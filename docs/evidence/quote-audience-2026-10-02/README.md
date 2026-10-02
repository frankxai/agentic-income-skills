# Buyer wording and owner notes

Four Codex lead-authored refinements use the original frozen synthetic Q04, Q07,
Q08 and Q10 requests and pinned EUR 120.00 inspection catalogue. This slice fixes
the mixed-audience output observed in the [native-host study](../quote-host-2026-10-02/README.md).
Every original study message and failure remains unchanged.

The useful result is two editable texts in one saved revision. Buyer wording
addresses the request. Owner notes carry the scenario's connector/approval status,
source review and duplicate handling. In Q04 the discount decision remains pending;
the buyer message does not decline it on the owner's behalf. All four messages
retain unconfirmed scope, tax, timing and final quote, and remain nonbinding drafts.

[cases.json](cases.json) retains the exact supplied refinements. The actual local
CLI saves both texts, exits, reopens each record in another process, repeats original
intake, and exports these owner-review packets:

| Case | Buyer-wording candidate | Internal notes | Owner review |
| --- | --- | --- | --- |
| Q04 | [quote.txt](Q04/quote.txt) | [owner-notes.txt](Q04/owner-notes.txt) | [quote.md](Q04/quote.md) |
| Q07 | [quote.txt](Q07/quote.txt) | [owner-notes.txt](Q07/owner-notes.txt) | [quote.md](Q07/quote.md) |
| Q08 | [quote.txt](Q08/quote.txt) | [owner-notes.txt](Q08/owner-notes.txt) | [quote.md](Q08/quote.md) |
| Q10 | [quote.txt](Q10/quote.txt) | [owner-notes.txt](Q10/owner-notes.txt) | [quote.md](Q10/quote.md) |

[proof.json](proof.json) binds the source revision, frozen plan, supplied text,
reopened revision, duplicate snapshot and exported file hashes. Each packet has
the complete MIT licence and its own receipt. The full private workspaces and CLI
results are retained by the source task; the public proof omits local filesystem
paths. The producer is a local Node process; it does not call a model API. Root
Codex authoring costs, invoices, revenue and ROI are unknown. No zero-cost claim
follows from the absence of a model API in the runtime.

The serious alternative remains the prior capable plain-guide host, which completed
the same outcome set. These four refinements were deliberately authored after
inspection of the earlier defects. They are an internal regression demonstration,
not a new randomized comparison, unassisted host run, domain grade, measured human
repair time or outside-user result. No paid advantage or paid release is established.
Q07/Q10 connector states are supplied scenario data; no live connector was checked.

The entire exported folder is internal owner-review material. Only quote.txt is a
buyer-wording candidate after human review. Record/configuration/request files also
contain internal material. Separate fields do not classify prose, prevent a user
putting notes into buyer wording, enforce confidentiality or authorize sending.
Runtime outbound actions remain disabled. Historical snapshots reopen with empty
notes without rewriting them; older runtimes cannot read new snapshots containing
ownerNotes, so all cooperating writers must upgrade together.

Ten added deterministic checks cover atomic text-pair saves, notes-only edits,
clarification warnings, invalid/stale input, byte-preserved legacy reopening,
interrupted commit recovery and these four exact messages. They establish those
engineering behaviors only. Permissioned domain/outside-user cold use with repair
effort and advantage evidence remains due 10 October; the paid quality, rights and
support gate remains open for 15 October under [issue 11](https://github.com/frankxai/agentic-income-skills/issues/11).

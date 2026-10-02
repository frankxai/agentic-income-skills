# Local request-to-quote workflow

Prepare one inspectable draft from an owner-supplied catalogue and request. The owner
can record attributed clarification, edit buyer wording and separate internal notes,
close the process, reopen the same
work, and export a packet for review. Duplicate intake preserves the edited record. There is no account,
hosted runtime, npm dependency, connector, message sender or payment integration.

This is an original free MIT implementation of the existing request-to-quote
reference. The broader IncomeSystem manifest remains a contract; its connector,
legal-principal, evaluation, pricing and credential-rotation declarations are not
implemented or verified by this local tool.

## First complete run

Node.js 20 or newer is required. From the repository root, choose a fresh workspace
under an existing parent folder. The following run deliberately uses fictional
sample inputs. Replace all three with explicitly permissioned owner inputs for
actual work; never substitute examples for missing permission or prices.

```sh
node scripts/quote-desk.mjs init --workspace "../local quote desk" --principal skills/quote-desk/examples/principal.json --catalog skills/quote-desk/examples/catalog.json
node scripts/quote-desk.mjs intake --workspace "../local quote desk" --request skills/quote-desk/examples/request.json --service inspect --quantity 1
```

The result includes `id`, `revision`, source/configuration hashes, a qualification,
catalogue amount and nonbinding draft. Copy the returned `id` into subsequent
commands. It is a SHA-256 trace identifier, not an authorization token. Omitting
quantity asks for missing scope/units. Unsupported service IDs escalate without
inventing a service or amount. Prices are exact two-place EUR decimals and
quantities are known integers from 1 through 10000. Tax and timing remain unconfirmed.

When missing scope is clarified, retain the original trace and request. Create an
owner-supplied `clarification.json` containing only these fields:

```json
{
  "service": "maintain",
  "quantity": 3,
  "note": "The owner confirms three hours and equipment details.",
  "sourceReference": "reference-to-the-permissioned-reply"
}
```

```sh
node scripts/quote-desk.mjs clarify --workspace "../local quote desk" --id <returned-id> --revision <current-number> --clarification clarification.json
```

Use the actual approved reply; the example above is fictional. Clarification
recomputes the structured amount from the pinned catalogue and saves its source
reference, without changing the original request or trace. Attribution is the
owner's declaration: the underlying reply is not stored, hashed or verified.
An unedited catalogue
message is regenerated. Operator wording is preserved, even if it now describes an
old quantity or amount. The saved `wordingReviewRequired: true` flag survives show,
reopen, duplicate intake and export; a prominent packet banner and receipt carry it.
Review and save wording before use. Any saved wording edit clears this specific
warning; it does not verify semantic accuracy or remove the general human-review
requirement. Explicit recovery restores the chosen snapshot's review state.
Legacy clarified operator records are conservatively flagged when the field is
missing. Up to 50 clarifications can be saved. Stale revisions and price
override fields are refused. This is a draft selection, never price approval.

Write buyer wording in a fresh UTF-8 file without a BOM, such as `quote-wording.txt`.
Write internal source/approval/connector/recovery notes in a separate `owner-notes.txt`.
Keep both grounded in the supplied source and uncertainty. A discount request awaits
an owner decision; do not accept or decline it on the owner's behalf. Save both and reopen:

```sh
node scripts/quote-desk.mjs edit --workspace "../local quote desk" --id <returned-id> --revision <current-number> --draft quote-wording.txt --owner-notes owner-notes.txt
node scripts/quote-desk.mjs show --workspace "../local quote desk" --id <returned-id>
node scripts/quote-desk.mjs export --workspace "../local quote desk" --id <returned-id> --output "../quote review packet"
```

Both texts commit in one revision. `--draft` alone preserves existing notes;
`--owner-notes` alone preserves buyer wording, its origin and any pending
selection-change warning. An empty notes file explicitly clears notes. A stale
revision or invalid text in either input refuses the entire edit. Notes share the
wording's size/encoding bounds and are untrusted data, never authority.

The export folder must be new and outside the workspace. Existing folders, even
empty ones, are preserved. Every export contains:

- `quote.md`: wording inside a literal code fence and the catalogue amount, with a draft notice;
- `quote.txt`: exact editable buyer-wording bytes, including CRLF when supplied;
- `owner-notes.txt`: exact internal notes, empty when none are saved;
- `record.json`: both text fields, selected service, request, qualification, revision and provenance;
- `request.json`, `catalog.json` and `workspace.json`: inspectable inputs and the complete normalized principal/catalogue configuration;
- `LICENSE`: complete MIT terms and copyright notice;
- `receipt.json`: per-file SHA-256 hashes, source/configuration hashes and honest local-draft state.

The entire packet is owner-review material. The receipt identifies `quote.txt` as
the buyer-wording candidate and `owner-notes.txt` as internal notes. Other files
also contain owner notes, supplied contacts, original requests and configuration;
never forward the whole packet as a buyer message. Human review must check that
internal material was placed in the correct field. This is text separation,
not semantic filtering, confidentiality enforcement, approval or sending.

The default wording is deterministic catalogue arrangement. Operator/host edits
are labelled `operator-edit`; the runtime cannot determine whether a host used a
model or verify prose, claims, tax, timing, rights or price consistency in prose.
The stored structured amount cannot be changed by editing wording. Every record
still requires source and human review; exporting does not grant approval.
The receipt states `runtimeModelGeneration: false`, `hostModelGeneration: "unknown"`,
wording origin and `proseReviewRequired: true`. It does not classify the host's
authorship. Fictional inputs are clearly labelled in the packet. Hashing the
exported `workspace.json` recomputes the configuration hash. Older development
snapshots acquire default clarification fields and empty owner notes when read;
their stored bytes and pointer hashes stay unchanged. Their exported normalized
`record.json` may differ from the original snapshot bytes. Both hashes have separate
receipt fields. No model API runs inside the runtime. Cost and revenue remain unknown
in its receipt. Attribute any separate host call from its actual native receipt.

## Export selected buyer wording

After authoring and reviewing the words, use `show` to read the current revision
and `snapshotHash`. An explicit buyer export creates a separate folder:

```sh
node scripts/quote-desk.mjs export-buyer --workspace "../local quote desk" --id <returned-id> --revision <current-number> --snapshot-sha256 <snapshotHash> --output "../buyer wording draft"
```

The selected revision and hash must match the current saved snapshot. This avoids
silently exporting a newer edit or an older source selection. The runtime requires
operator wording and refuses the persistent selection-change warning; saving an
edit clears that warning without certifying the prose. The existing workspace
writer lock is held until the export finishes, so cooperating writers cannot
change the selected record during export. A foreign lock stays untouched.

The folder contains four files: exact `quote.txt`, `README.md`, the helper's MIT
`LICENSE` and `receipt.json`. It omits separate notes, requests, contacts, catalogue
and full workspace configuration. Trace/revision/source fingerprints are returned
to the owner's command only. This reduces copying of unrelated internal files;
it cannot detect material the author put in the wording or establish confidentiality.
Review the complete message, source, structured amount and rights before use.
The helper licence does not establish rights to owner-supplied text.

Record `receiptHash` from the owner's export result separately from the folder.
Verify the received or reopened export with that retained hash:

```sh
node scripts/quote-desk.mjs verify-buyer --directory "../buyer wording draft" --receipt-sha256 <retained-receiptHash>
```

The verifier reads the same bounded receipt bytes for hashing and parsing, checks
the exact four-file layout and draft metadata, and checks all three bounded UTF-8
plain-text payloads against the receipt. It refuses missing/extra or nonordinary
files, invalid metadata and mismatched payloads without changing the folder.
Changing both wording and receipt cannot pass an unchanged retained receipt hash.
If the caller trusts a replacement hash, only those new bytes' integrity is checked.
Do not compute a received folder's own hash and present it as independent evidence.
The expected hash does not itself authenticate an owner, merchant or publisher.

Existence of a receipt alone is insufficient. A missing, invalid or mismatched receipt marks
unfinished or changed output. Preserve it and retry into a fresh sibling; an existing
folder is always refused. A failed export leaves saved work unchanged. The folder
remains a draft requiring human review; no approval, price change or delivery occurs.
For example, an authored clarification response may export with no catalogue amount;
the runtime checks provenance and state, not whether a quoted amount appears in prose.

Manual copying of the reviewed `quote.txt` is a capable alternative and produces
the same wording. The explicit command additionally checks the selected snapshot,
pending wording warning and cooperating-writer lock, and emits a bounded receipt.
This is an engineering capability, without measured outside-user repair/time,
demand or paid-benefit evidence. The original internal `export` remains available.

## Input and installation boundaries

`principal.json` requires a plain `id`, name, explicit `localDraftingAllowed` and
`sourceUseAllowed` true, and explicit `synthetic` true/false. Those are local
declarations, not legal verification. "Approved catalogue" means the owner's
external declaration, not a runtime-verified approval. A catalogue requires an ID, EUR currency,
synthetic declaration and 1-100 unique service items with ID/name/unit and two-place
decimal `draftUnitPrice`. Zero is allowed as an explicit catalogue declaration and
does not establish a free-price approval. The local request format uses the reference
field names, with stricter bounds: requestId is plain text of 1-512 characters
(including email Message-IDs), source is web/email/approved-api, contact has bounded
name/email, and summary has at least 10 characters after trimming outer whitespace and at most 16384
characters. receivedAt requires a valid calendar date-time with seconds and an
explicit timezone; leap seconds are unsupported. This hand-written local subset is
not the full reference JSON Schema validator. No additional properties are accepted.
Each input file is bounded to 512 KiB; wording and owner notes to 32768 characters each.
The complete serialized saved record must also fit 512 KiB. Large multibyte wording,
notes and accumulated clarifications can reach that bound before individual text
limits. An oversized write refuses before creating a snapshot and preserves the
current pointer and all prior work. Files require
valid UTF-8 without a BOM; invalid bytes, lone Unicode surrogates, C0/C1 controls
except tab/CR/LF, U+202A-202E, U+2066-2069 and U+FEFF are refused while the supplied
file is preserved. Other Unicode shaping/invisible characters are allowed and
need human prose review. Ordinary Unicode and
CRLF are retained. CLI quantity, revision and PID values use plain positive decimal
integers, never hexadecimal, exponent notation or fractional strings. Secrets are
never needed.

The workspace pins its exact normalized principal and catalogue. Use a new
workspace for a changed owner/catalogue; do not edit its internal files as a
configuration interface. Customer inputs and exports contain contact/source data
and belong outside Git and public evidence packets. Back them up in the owner's
chosen storage. Unix restrictive file modes do not replace Windows ACLs.

The complete `skills/quote-desk/` folder is independently usable, including runtime,
examples and licence. From that folder, the same commands use
`scripts/quote-desk.mjs`, `examples/principal.json` and `examples/catalog.json`.
The repository-level script delegates to this one implementation. Actual remote
installer and host discovery still require their own compatibility proof.

## Restart, conflicts and recovery

Run `show` in a new process to reopen committed work. Repeating identical intake
returns the latest record, including edits and clarifications. Its original intake
selection must be repeated; clarify is the explicit path for later scope changes.
If the pointer is missing but any prior snapshot or pending record exists, intake
refuses to fork a new revision. Inspect history and explicitly recover the chosen
work before retrying.
Reusing a source ID with changed content or a different initial selection stops.
A stale edit revision also stops; reopen and reconcile instead
of overwriting the newer work.

The runtime appends JSON snapshots, flushes them before an atomic current-pointer
replacement and never overwrites a snapshot. They remain writable by the filesystem
owner; checksums detect accidental changes and are not signatures or immutable storage.
A stopped process or failed replacement can leave an uncommitted snapshot and
pending file. Neither becomes current automatically. File corruption is detected
by checksums and source/catalogue validation. This is local process-restart
recovery, not cloud sync, encrypted storage or a power-loss guarantee.

Inspect candidate history before an explicit recovery:

```sh
node scripts/quote-desk.mjs history --workspace "../local quote desk" --id <returned-id>
node scripts/quote-desk.mjs recover --workspace "../local quote desk" --id <returned-id> --snapshot <chosen-filename> --sha256 <chosen-checksum> --pointer-sha256 <current-pointer-checksum>
```

History lists valid committed and uncommitted history snapshots; it does not list
`records/*.pending` files. Timestamps and
revision numbers alone do not establish which one was committed. `pointerState`
and `currentSnapshot` identify a readable current pointer, and entries mark
`selectedByCurrentPointer`; corrupt or missing pointers do not select a candidate.
For a missing pointer only, use the literal
`missing` value when history reports `pointerHash: null`. Recovery verifies both
checksums, preserves previous pointer bytes and creates a new revision. It never
renews approvals or reconnects tools.

A writer lock blocks concurrent writes. The runtime removes only its own exact
lock bytes after completing a call. A crashed writer's lock remains, with its PID,
token, host, start time and configuration hash. Use `lock --workspace <path>` to inspect it.
Do not remove one by age or inferred inactivity. First identify the owner and
its authoritative stopped-process receipt. For your own acknowledged stopped
writer, use `unlock --workspace <path> --owner-token <token> --owner-pid <pid>`.
The token is not permission. The runtime checks both fields and requires that the
PID is absent on the same host; a foreign host, present/reused PID or permission
error leaves the lock intact. Use an owner-controlled local disk, never a shared
network or cloud-synchronized directory for concurrent writers. All cooperating
writers must use one OS and one PID namespace. Do not share a workspace across
Windows/WSL, containers or PID namespaces; the hostname check does not isolate them.
It sends only the process-existence probe, never a termination signal. Another
task's lock still requires that owner's handoff. A legacy lock without a host, an
empty/partial lock, or PID reuse needs manual owner reconciliation; this runtime
cannot release it. Preserve the lock and workspace, identify the exact writer from
its terminal receipt, and obtain the owner's explicitly documented maintenance
decision. Age and apparent inactivity never authorize removal. The abrupt-stop regression test
owns its child and confirms its terminal exit before testing this operation.
This runtime assumes a trusted local filesystem and cooperating writers. Checks
reject direct directory/file links and accidental tampering; they are not a
sandbox against another process with authority to change that filesystem.

A failed init or export can leave a partial folder. An export without `receipt.json`
is incomplete. Preserve the original and use a fresh sibling path for retry after
resolving the write error. Never reuse, delete or treat a partial folder as a
completed packet. Failed exports do not modify the saved record.

## Verification and remaining gates

`node --test tests/quote-desk.test.mjs` exercises the ten previously frozen inputs,
real CLI editing, clarification and reopening, isolated skill copying, duplicate/state preservation, stale
edits, denied operations, corruption, interrupted pointer replacement, restrictive
paths, strict UTF-8, literal exports, missing-pointer recovery, malformed locks,
partial-write failures and preserved existing targets. `npm test` currently has
31 original quote-workflow checks, 11 audience/recovery checks and 7 existing
IncomeSystem checks, plus 14 buyer-export checks, 63 in total. Hosted
CI covers Windows and Linux on Node 20 and 24. These are deterministic engineering checks.
The buyer-export tests cover exact output/internal-payload separation, stale/current
selection, unreconciled/default wording, foreign locks, interrupted writes,
fresh-sibling recovery, copied-skill export/verification, checksum-bound verification
and the semantic-review boundary.
The frozen file retains `actualResults: null` as the original pre-run plan. Its
historical source hashes remain frozen reference metadata; the fixture checksum
binds the plan and inputs, without attesting current platform-dependent source bytes.

The request-to-quote product tracks [issue 11](https://github.com/frankxai/agentic-income-skills/issues/11).
The [2 October native-host study](evidence/quote-host-2026-10-02/README.md) retained
real authored wording, packets, fresh-process reopening, failures and native
receipts. The capable plain-guide baseline completed the same ten synthetic
outcomes. The passive plugin was discovered but unused; a separately labelled
explicit activation condition invoked the native skill. This is scoped Windows
local-host evidence, not a paid advantage or unassisted outside-user acceptance.
Outside-user task acceptance, semantic domain usefulness, repair-time advantage,
broader supported-host and installer behavior, seller/rights and sandbox
purchase/refund/update proof remain separate. The runtime source has its own
exact revision review; this evidence publication needs its own review. Do not infer them from a schema, test suite, example amount or export.

The [buyer/owner refinement](evidence/quote-audience-2026-10-02/README.md) records four
lead-authored synthetic messages using the same frozen Q04/Q07/Q08/Q10 inputs.
Historical host wording remains unchanged. It demonstrates separate saved/exported
texts and local reopening, not a new host comparison or outside-user acceptance.
Older runtimes cannot read snapshots containing the new `ownerNotes` field; preserve
the current runtime with the workspace and upgrade all cooperating writers together.

Node persistence APIs were checked against [official Node24 filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html).
The existing source and new skill use the repository's MIT licence. No third-party
runtime dependency was added and no commercial licence or price was changed.

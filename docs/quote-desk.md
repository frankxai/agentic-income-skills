# Local request-to-quote workflow

Prepare one inspectable draft from an approved catalogue and request. The owner
can edit its wording, close the process, reopen the same work, and export a packet
for review. Duplicate intake preserves the edited record. There is no account,
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
quantities are known integers from1 through10000. Tax and timing remain unconfirmed.

Write useful wording in a fresh UTF-8 file such as `quote-wording.txt`. Keep it
grounded in the supplied source, catalogue and uncertainty. Then save and reopen:

```sh
node scripts/quote-desk.mjs edit --workspace "../local quote desk" --id <returned-id> --revision 1 --draft quote-wording.txt
node scripts/quote-desk.mjs show --workspace "../local quote desk" --id <returned-id>
node scripts/quote-desk.mjs export --workspace "../local quote desk" --id <returned-id> --output "../quote review packet"
```

The export folder must be new and outside the workspace. Existing folders, even
empty ones, are preserved. Every export contains:

- `quote.md`: readable, editable wording and the catalogue amount, with a draft notice;
- `record.json`: selected service, request, qualification, revision and provenance;
- `request.json` and `catalog.json`: inspectable inputs;
- `LICENSE`: complete MIT terms and copyright notice;
- `receipt.json`: per-file SHA-256 hashes, source/configuration hashes and honest local-draft state.

The default wording is deterministic catalogue arrangement. Operator/host edits
are labelled `operator-edit`; the runtime cannot determine whether a host used a
model or verify prose, claims, tax, timing, rights or price consistency in prose.
The stored structured amount cannot be changed by editing wording. Every record
still requires source and human review; exporting does not grant approval.
No model API runs inside the runtime. Cost and revenue remain unknown in its
receipt. Attribute any separate host call from its actual native receipt.

## Input and installation boundaries

`principal.json` requires a plain `id`, name, explicit `localDraftingAllowed` and
`sourceUseAllowed` true, and explicit `synthetic` true/false. Those are local
declarations, not legal verification. A catalogue requires an ID, EUR currency,
synthetic declaration and1-100 unique service items with ID/name/unit and two-place
decimal `draftUnitPrice`. The request follows the reference fields: requestId,
web/email/approved-api source, name/email contact, summary of10-16384 characters
and ISO receivedAt. No additional properties are accepted. Each input file is
bounded to512KiB; wording to32768 characters. Secrets are never needed.

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
returns that record, including edits. Reusing a source ID with changed content or
selection stops. A stale edit revision also stops; reopen and reconcile instead
of overwriting the newer work.

Immutable JSON snapshots are flushed before an atomic current-pointer replacement.
A stopped process or failed replacement can leave an uncommitted snapshot and
pending file. Neither becomes current automatically. File corruption is detected
by checksums and source/catalogue validation. This is local process-restart
recovery, not cloud sync, encrypted storage or a power-loss guarantee.

Inspect candidate history before an explicit recovery:

```sh
node scripts/quote-desk.mjs history --workspace "../local quote desk" --id <returned-id>
node scripts/quote-desk.mjs recover --workspace "../local quote desk" --id <returned-id> --snapshot <chosen-filename> --sha256 <chosen-checksum> --pointer-sha256 <current-pointer-checksum>
```

History includes valid committed and uncommitted candidates; timestamps and
revision numbers alone do not establish which one was committed. Check the current
record's snapshot when available. For a missing pointer only, use the literal
`missing` value shown by history's null pointer hash. Recovery verifies both
checksums, preserves previous pointer bytes and creates a new revision. It never
renews approvals or reconnects tools.

A writer lock blocks concurrent writes. The runtime removes only its own exact
lock bytes after completing a call. A crashed writer's lock remains, with its PID,
token, start time and workspace hash. Use `lock --workspace <path>` to inspect it.
Do not remove one by age or inferred inactivity. First identify the owner and
its authoritative stopped-process receipt. For your own acknowledged stopped
writer, use `unlock --workspace <path> --owner-token <token> --owner-pid <pid>`.
The token is not permission. The runtime checks both fields and requires that the
PID is absent; a present/reused PID or permission error leaves the lock intact.
It sends only the process-existence probe, never a termination signal. Another
task's lock still requires that owner's handoff. The abrupt-stop regression test
owns its child and confirms its terminal exit before testing this operation.
This runtime assumes a trusted local filesystem and cooperating writers. Checks
reject direct directory/file links and accidental tampering; they are not a
sandbox against another process with authority to change that filesystem.

## Verification and remaining gates

`node --test tests/quote-desk.test.mjs` exercises the ten previously frozen inputs,
real CLI reopening, isolated skill copying, duplicate/state preservation, stale
edits, denied operations, corruption, interrupted pointer replacement, restrictive
paths and preserved existing targets. These are deterministic engineering checks.
The frozen file retains `actualResults: null` as the original pre-run plan.

The request-to-quote product tracks [issue11](https://github.com/frankxai/agentic-income-skills/issues/11).
Outside-user task acceptance, a capable-host comparison, semantic draft quality,
repair-time advantage, supported-host and installer behavior, independent exact
revision review, seller/rights and sandbox purchase/refund/update proof remain
separate. Do not infer them from a schema, test suite, example amount or export.

Node persistence APIs were checked against [official Node24 filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html).
The existing source and new skill use the repository's MIT licence. No third-party
runtime dependency was added and no commercial licence or price was changed.

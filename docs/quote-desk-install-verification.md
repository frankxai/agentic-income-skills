# Quote-desk remote installation check

Observed 27 October 2026 (Europe/Amsterdam). This is an internal synthetic
installation rehearsal, not outside-user acceptance or a model comparison.

Source repository main after PR #26, merge commit
`4338d599c4f9d73d3803db88783511b143b18e81`.
Installer-reported skill hash:
`38f18d79798c17b538b25b4d1c93f95df1e41746adc36be47c2565b8885b20a0`.
The installer command followed the default branch; it was not revision-pinned.

Environment: Node v24.22.1; skills CLI 1.7.4; Linux. In a fresh directory:

```sh
npx --yes skills@1.7.4 add frankxai/agentic-income-skills --skill quote-desk --agent codex --copy --yes --json
```

The actual rehearsal used unversioned `skills`; its resolved version was read
separately as 1.7.4. The versioned command above records that observed CLI version.
The installer returned installed status at `.agents/skills/quote-desk`, with
runtime, examples and licence present.

From that installed skill directory, direct Node calls completed:
init → intake → edit → show → export-buyer → verify-buyer.
Inputs were the bundled fictional principal, catalogue and request; service
`inspect`, quantity 1. The structured draft subtotal was EUR 120.00, approval
was required and outbound actions remained disabled.

An authored fictional response was saved, reopened, then exported using the
current revision and snapshot hash. Verification returned
`buyer-export-integrity-pass` against the independently retained export receipt
hash. Changing only the exported wording caused verification to exit nonzero.

Receipt hash retained from that export:
`eab97a37edf03e13edbbe448638e6eea520a9a2619244971527c4de03c0af9aa`.

This verifies one project-local Codex-targeted copy installation and local CLI
workflow. It does not verify Codex skill auto-discovery/invocation, other hosts,
Windows/macOS, interactive installation, future installer versions, customer use,
identity, rights, approval, delivery or paid advantage. No model APIs or outbound
messages were used by the quote-desk runtime.

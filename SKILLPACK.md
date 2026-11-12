# Agentic Income skill pack

**Repo:** `frankxai/agentic-income-skills` (this tree)  
**Not an awesome-* catalog.** Paid-work outcome systems. Human principal owns money and approvals.

```sh
npx skills add frankxai/agentic-income-skills --skill agentic-income
```

Agent entry point: [`llms.txt`](./llms.txt).

## Include

- `agentic-income` — discover -> validate -> build -> sell -> deliver -> prove
- `quote-desk` — permissioned local request -> editable draft -> reopen/recover -> inspectable export. Its Node runtime, examples and MIT licence are bundled inside the skill; no npm dependency or connector is needed. See [the working path](docs/quote-desk.md).

## Compatibility (not this pack)

- `affiliate-audit` stays in-repo for now; it belongs to the **Agentic Passive Income** pack (`frankxai/agenticpassiveincome`).

## Exclude

- DPI / crypto yield
- Unrestricted wallet or auto-pay
- awesome-agentic-income (catalog)

## MCP pair (live)

Server `agentic-income`, version `1.0.0`, transport `streamable-http`.

- Endpoint: <https://www.agenticincome.ai/api/mcp>
- Manifest: <https://www.agenticincome.ai/.well-known/mcp.json>

Sixteen tools, grouped by the job they do:

| Job | Tools |
| --- | --- |
| Income models | `list_income_models`, `get_income_model` |
| Partner programs | `search_partner_programs`, `get_partner_program` |
| Products | `list_products` |
| Fit | `fit_check` |
| Playbook | `get_playbook` |
| Income graph | `describe_income_graph_schema`, `get_reference_income_graph`, `review_income_graph`, `draft_income_graph`, `draft_income_system_manifest`, `export_income_system_tasks` |
| Economy Vault | `search_digital_economies`, `list_supply_costs`, `calculate_unit_margin` |

Every tool is read-only or a draft/export generator. None writes to the server, charges money, places an order, or predicts revenue. Affiliate links returned by the catalog tools are disclosed in the payload. Economy Vault queries default to `confirmedOnly: true`, and `calculate_unit_margin` refuses unknown, unpriced or unconfirmed inputs rather than estimating them.

Integration steps and example calls: [docs/MCP.md](docs/MCP.md). The evidence standard behind any published number: [docs/EVIDENCE-CONTRACT.md](docs/EVIDENCE-CONTRACT.md).

## Maintain

`npm test` and `npm run income:validate`. Improve the brain skill from real Outcome Pack failures. Do not add affiliate/content-pipeline skills here — those go to agenticpassiveincome. Any public claim follows [docs/EVIDENCE-CONTRACT.md](docs/EVIDENCE-CONTRACT.md).

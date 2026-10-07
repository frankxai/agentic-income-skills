# Agentic Funnel Builder — source prototype

Four portable skills and five advisory MCP tools link product evidence to funnel design, delivery readiness, and economics.

This package extends the existing IncomeSystem / Outcome Pack discipline. It can reference an IncomeAsset without moving ownership of passive-asset operations into the paid-work skill. It is MIT source, not a hosted service, a marketplace release, or a promise of income.

## Run

Use Node.js 20 or newer:

    cd plugins/agentic-funnel-builder
    npm install --ignore-scripts --no-audit --no-fund
    npm test
    npm run demo
    npm start

The demo uses a clearly synthetic product and recommends a waitlist because fulfillment is unconfigured. npm start launches a stdio MCP server using the official SDK. No API keys are needed; no network requests, file reads beyond program loading, payment actions, publishing, or messages occur inside the tools.

## Tools

| Tool | Actual behavior |
|---|---|
| validate_product_contract | Validates Zod structure, IDs, references and required acceptance |
| compile_funnel_blueprint | Returns three draft page purposes, sections, events and readiness findings |
| review_launch_readiness | Flags declared evidence, artifact-version, price and delivery gaps |
| model_unit_economics | Calculates scenario contribution with labor and acquisition costs |
| evaluate_activation_experiment | Reviews fixed-horizon counts with a labeled normal approximation |

All tool annotations are read-only. Readiness and evidence labels are caller-supplied. A model can forge a source reference or approval string; this package deliberately never treats that as production authority. A ready-for-evidence-review result is an invitation to inspect underlying evidence. The 90-day evidence window is a prototype policy, not a universal research rule.

The evidence dictionary does not retrieve or license source material. The funnel compiler returns a blueprint, not rendered pages or AI-generated copy. The experiment helper assumes independent randomized observations and is not a sequential testing or causal-inference engine.

## Skills and hosts

- engineer-value-product: buyer evidence and useful deliverables.
- build-agentic-funnel: original offer/journey design linked to proof.
- verify-funnel-delivery: promise through payment, entitlement and first value.
- improve-outcome-loop: cohort quality and economics.

Load SKILL.md with your coding agent. Codex and Claude manifests are included as source packaging. The .mcp.json path uses the Claude plugin root variable; host installation and variable expansion require a separate smoke test. For any stdio host, use command node with an absolute path to src/server.mjs in its MCP configuration. Do not claim a directory installation until that host has actually loaded it.

For ChatGPT remote deployment, add Streamable HTTP, per-user OAuth/tenant isolation, request limits, deployment and host tests using the current official plugin documentation. No remote server or universal-directory listing has been created by this source change.

## Production boundary

Use existing GitHub/Vercel, payment, email and workflow connectors as separate adapters. ChatGPT connector credentials are not available to an independently hosted backend. Production writes need server-side authority bound to user, tenant, action, exact digest, environment, expiry and budget.

Do not embed ClickFunnels or other vendor credentials into this package. An optional ClickFunnels adapter should use their existing MCP/API; do not build another generic ClickFunnels proxy.

## Verification and next work

The checks include a real official-SDK client/server stdio handshake and invocation, plus acceptance/evidence failure cases, economic arithmetic and low-sample experiment behavior. The dedicated GitHub workflow runs them in isolation. Core checks are named .check.mjs to avoid accidental discovery by the parent repository's independent test runner.

Direct dependencies are pinned. The source prototype was preserved through GitHub after a local runtime interruption; a committed dependency lock and complete host/manifest validation remain release gates unless a later verification record states otherwise.

See docs/ARCHITECTURE.md and docs/METHODS.md for design, sources, scope and limitations.

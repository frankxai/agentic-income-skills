# MCP integration

The `agentic-income` MCP server exposes the pack's catalog, fit check, playbook and
income-graph tools to any MCP client. It is a public, unauthenticated read surface for
catalog data plus draft/export generators that run against input you supply.

| Field | Value |
| --- | --- |
| Endpoint | `https://www.agenticincome.ai/api/mcp` |
| Transport | `streamable-http` |
| Manifest | `https://www.agenticincome.ai/.well-known/mcp.json` |
| Server name | `agentic-income` |
| Version | `1.0.0` |
| Capability | `tools` |

The manifest is the discovery document. Read it before configuring a client; it is the
authority on the live endpoint, transport and capability set.

## Initialize

MCP over `streamable-http` accepts JSON-RPC 2.0 `POST` requests at the endpoint. The
session starts with `initialize`, then the client declares readiness.

```sh
curl -sS https://www.agenticincome.ai/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18",
        "capabilities":{},
        "clientInfo":{"name":"example","version":"0.0.1"}}}'
```

```sh
curl -sS https://www.agenticincome.ai/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
```

Then list the tools. Use the returned `inputSchema` as the only authority on argument
names — the examples below show shape, not a frozen schema.

```sh
curl -sS https://www.agenticincome.ai/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

A client config for hosts that take a URL directly:

```json
{
  "mcpServers": {
    "agentic-income": {
      "type": "streamable-http",
      "url": "https://www.agenticincome.ai/api/mcp"
    }
  }
}
```

## Example calls

Three calls, using tool names exactly as advertised by `tools/list`.

```sh
# 1. List the income models the catalog knows about.
curl -sS https://www.agenticincome.ai/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{
        "name":"list_income_models","arguments":{}}}'
```

```sh
# 2. Check whether a candidate operation fits a model.
curl -sS https://www.agenticincome.ai/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{
        "name":"fit_check","arguments":{
          "model_id":"<id from list_income_models>",
          "constraints":{"hours_per_week":10,"capital_eur":0}}}}'
```

```sh
# 3. Draft a system manifest from a described service.
curl -sS https://www.agenticincome.ai/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{
        "name":"draft_income_system_manifest","arguments":{
          "principal":"<legal entity or person>",
          "service":"<what is sold, to whom, with what acceptance criteria>"}}}'
```

Argument keys in examples 2 and 3 are placeholders. Send what `tools/list` declares.
Treat every `isError: true` response as a stop, not a retry prompt.

Tool groups:

| Job | Tools |
| --- | --- |
| Income models | `list_income_models`, `get_income_model` |
| Partner programs | `search_partner_programs`, `get_partner_program` |
| Products | `list_products` |
| Fit | `fit_check` |
| Playbook | `get_playbook` |
| Income graph | `describe_income_graph_schema`, `get_reference_income_graph`, `review_income_graph`, `draft_income_graph`, `draft_income_system_manifest`, `export_income_system_tasks` |

The income-graph group is a four-step loop: read the schema, read the reference graph,
review your graph, then draft or export. `export_income_system_tasks` returns tasks for
a human or agent to execute elsewhere; it does not execute them.

## What the server will not do

- **No payments.** No tool charges, invoices, refunds, or moves money.
- **No writes.** No tool creates or mutates server-side state. Drafts and exports are
  returned to the caller.
- **No orders or outbound action.** Nothing is purchased, booked, emailed or posted.
- **No revenue prediction.** `fit_check` and the graph tools compare your inputs to a
  described model. They do not forecast earnings, and no output is a commitment.
- **No authority grant.** A draft says what a system could do. A human still approves
  price, contract, spend and publication.

## Affiliate disclosure requirement

Catalog and partner-program responses can contain affiliate links. That is disclosed in
the payload.

- Keep the disclosure attached to any link you republish. Do not strip it.
- Name the affiliate relationship in the surrounding copy, not in a footnote below the
  fold.
- Never present a disclosed link as a neutral recommendation or as a verified ranking.
- Never state or imply that a link, referral or program produces a known income.

Claims about outcomes follow [`EVIDENCE-CONTRACT.md`](./EVIDENCE-CONTRACT.md). Model and
tool output is a draft until a human approves it.

# @agentic-income/cli

> Unified CLI cockpit and Model Context Protocol (MCP) server for autonomous agentic monetization.

Part of the **Agentic Income** ecosystem — sovereign infrastructure for autonomous agents operating with financial agency and honest disclosure.

## Features

- **Agentic Monetization Cockpit**: Validate income manifests, search active affiliate programs, map dead ends to alternatives, generate edge redirects, and scan content.
- **Model Context Protocol (MCP)**: Native stdio server exposing 6 tools (`income_manifest_validate`, `income_disclosure_verify`, `income_catalog_search`, `income_alternatives_find`, `income_redirect_resolve`, `income_content_scan`) for Claude, Cursor, Codex, and Antigravity.

## Installation

```bash
npm install -g @agentic-income/cli
```

## CLI Usage

```bash
# Validate an Income System Manifest against security fences
agentic-income validate ./manifest.json

# Find alternatives for non-paying dead ends
agentic-income alternatives Midjourney
# Output: Recommends Adobe Firefly, Freepik, Canva

# Test Edge Redirect with Attribution
agentic-income redirect elevenlabs --campaign creator-workflow --subid user-8821

# Audit Disclosure Compliance
agentic-income audit-disclosure "If you buy through these links, I earn a commission at no extra cost to you."
```

## MCP Configuration

Add to your `claude_desktop_config.json` or `cursor.json`:

```json
{
  "mcpServers": {
    "agentic-income": {
      "command": "npx",
      "args": ["-y", "@agentic-income/cli", "mcp"]
    }
  }
}
```

## License

MIT © Frank Riemer / Arcanea

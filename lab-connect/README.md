# Lab Connect — MCP Server (Proof of Concept)

Standalone MCP server that exposes Fagundo Training OS recovery data to Claude Desktop.

## Step 0 — Research Findings

### 1. Recommended way to build an MCP server in Node/TypeScript

Use the official **[TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)** (`@modelcontextprotocol/sdk` v1.x for production/POC).

The current recommended pattern (from [modelcontextprotocol.io build guide](https://modelcontextprotocol.io/docs/develop/build-server)):

1. Create an `McpServer` instance with name and version
2. Register tools with `server.registerTool(name, { description, inputSchema }, handler)`
3. Use **Zod** schemas for tool input validation
4. Return `{ content: [{ type: "text", text: "..." }] }` from handlers
5. Connect via `StdioServerTransport` and `await server.connect(transport)`
6. Compile TypeScript to ESM (`"type": "module"`, `module: "Node16"`)

**Logging rule for stdio:** Never write to stdout (`console.log`). Use `console.error` (stderr) only — stdout is reserved for JSON-RPC messages.

> Note: SDK v2 (`@modelcontextprotocol/server`) is in pre-alpha on the `main` branch. Stick with v1 `@modelcontextprotocol/sdk` for this POC.

### 2. stdio vs HTTP/SSE — which is simpler for Claude Desktop?

**Use stdio.** It is the simplest path for a local POC connecting to your own Claude Desktop.

| Transport | Complexity | Claude Desktop support |
|-----------|------------|------------------------|
| **stdio** | Low — Claude launches your process as a child | Native via `claude_desktop_config.json` |
| HTTP/SSE | Higher — need a running server, auth, deployment | Remote connectors via Settings UI (OAuth, etc.) |

For a single-user POC on your machine, stdio requires no network server, no port binding, and no auth layer beyond env vars in the config file.

### 3. How Claude Desktop connects to a custom MCP server

**Config file locations:**

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux (preview) | `~/.config/Claude/claude_desktop_config.json` |

**Easiest way to open it:** Claude Desktop → Settings → Developer → Edit Config

**Format:**

```json
{
  "mcpServers": {
    "lab-connect": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/fagundo-training-os/lab-connect/build/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key",
        "LAB_CONNECT_USER_ID": "your-supabase-user-uuid"
      }
    }
  }
}
```

**Important:**
- All paths must be **absolute**
- Fully quit and restart Claude Desktop after editing
- MCP tools appear in the UI only when at least one server connects successfully
- Logs: `~/Library/Logs/Claude/mcp*.log` (macOS) or `%APPDATA%\Claude\logs\` (Windows)

---

## Tools

### `get_recent_recovery`

Returns the user's recovery scores, HRV, and RHR for the last N days from connected wearables (WHOOP, Intervals.icu, etc.), using the same source-priority resolver logic as the main app's `/api/metrics/range` endpoint.

**Input:**

```json
{ "days": 7 }
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | number | 7 | Calendar days to include (1–90) |

**Output:** JSON with one row per day:

```json
{
  "days_requested": 7,
  "days_returned": 7,
  "data": [
    {
      "date": "2026-06-24",
      "readiness_score": 72,
      "readiness_color": "green",
      "hrv_rmssd": 45.2,
      "resting_hr": 52,
      "sources_used": {
        "readiness": "whoop",
        "hrv": "whoop",
        "resting_hr": "whoop"
      }
    }
  ]
}
```

### `get_todays_verdict`

Returns today's training recommendation from the app's decision engine (including the phase 18.5 contextual fatigue check). Uses the **live** coaching modules from `src/features/coaching/lib/` — not a stale copy.

**Input:** none (uses today's date)

**Output:**

```json
{
  "verdict": "Hold the Line",
  "state": "yellow",
  "confidence": "medium",
  "rationale": "HRV is within your normal range, but manageable. Complete today's session as prescribed — avoid adding extra intensity.",
  "signals": [
    { "name": "Recovery", "value": 55, "status": "moderate" },
    { "name": "HRV trend", "value": "-6% vs 7d", "status": "stable" }
  ],
  "asOfDate": "2026-06-30"
}
```

| Field | Values |
|-------|--------|
| `verdict` | `Ready to Push` / `Hold the Line` / `Back Off Today` |
| `state` | `green` / `yellow` / `red` |
| `confidence` | `high` / `medium` / `low` / `very_low` |

### `get_workouts`

Returns recent planned and completed training sessions from the active plan variant.

**Input:**

```json
{ "days": 7 }
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | number | 7 | Calendar days to include (1–30) |

**Output:**

```json
{
  "days_requested": 7,
  "sessions_returned": 5,
  "data": [
    {
      "date": "2026-06-28",
      "sessionName": "Z2 Erg + Mobility",
      "type": "z2",
      "duration": "52m",
      "completed": true,
      "plannedVsActual": "Planned: Z2 Erg + Mobility → Completed: rowing (52m)"
    }
  ]
}
```

Completion is detected via manual mark (`am_completed_at`) or auto-match against synced activities (Garmin/Strava), same as the Plan view.

---

## Setup

```bash
cd lab-connect
npm install
npm run build
```

Copy `.env.example` to `.env` and fill in your credentials (for local testing only — Claude Desktop uses the `env` block in its config).

### Local smoke test

```bash
# Verify the server starts (will wait on stdio)
npm start
# Ctrl+C to exit
```

For interactive testing, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

To verify all three tools register and call verdict/workouts against your data:

```bash
# Set env vars (or export from your Claude Desktop config)
export SUPABASE_URL=...
export SUPABASE_SERVICE_KEY=...
export LAB_CONNECT_USER_ID=...

npm run verify
```

This prints the raw `get_todays_verdict` JSON to stdout for sanity-checking against the app.

### Claude Desktop config example

After building, add to `claude_desktop_config.json` (replace paths and secrets):

```json
{
  "mcpServers": {
    "lab-connect": {
      "command": "node",
      "args": ["/Users/you/fagundo-training-os/lab-connect/build/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_KEY": "eyJ...",
        "LAB_CONNECT_USER_ID": "uuid-from-supabase-auth"
      }
    }
  }
}
```

Then ask Claude:
- *"What was my recovery like over the last 7 days?"*
- *"What's my training verdict for today?"*
- *"Show my workouts from the past week"*

---

## Architecture

```
Claude Desktop
    │ stdio (JSON-RPC)
    ▼
lab-connect/                    ← standalone MCP service
    │
    ├─► unified_metrics         ← recovery/HRV/RHR (get_recent_recovery)
    ├─► src/features/coaching/  ← snapshot + interpreter + decision engine (get_todays_verdict)
    └─► training_days + garmin_activities  ← plan + completion (get_workouts)
```

`get_todays_verdict` imports the **current** coaching engine from the main repo at runtime (`snapshotBuilder.js`, `physiologicalInterpreter.js`, `decisionEngine.js`) so the phase 18.5 fatigue-veto fix is always in sync with the app.

`get_workouts` reuses `getActiveVariant.js` and `sessionActivityMatcher.js` for the same plan variant and completion logic as the Plan view.

This POC does **not** modify existing app code — it reads shared modules and Supabase tables.

## Security note

The service role key bypasses Row Level Security. This is acceptable for a single-user local POC where `LAB_CONNECT_USER_ID` pins access to one user. Do not expose this server over HTTP without proper auth.

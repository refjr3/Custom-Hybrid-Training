#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createSupabaseClient,
  getConfiguredUserId,
  getRecentRecovery,
} from "./recovery.js";

const server = new McpServer({
  name: "lab-connect",
  version: "0.1.0",
});

server.registerTool(
  "get_recent_recovery",
  {
    description:
      "Returns the user's recovery scores, HRV, and RHR for the last N days from their connected wearables.",
    inputSchema: {
      days: z
        .number()
        .int()
        .min(1)
        .max(90)
        .default(7)
        .describe("Number of calendar days to include (default 7, max 90)"),
    },
  },
  async ({ days }) => {
    const supabase = createSupabaseClient();
    const userId = getConfiguredUserId();
    const data = await getRecentRecovery(supabase, userId, days);

    const summary = {
      days_requested: days,
      days_returned: data.length,
      data,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("lab-connect MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in lab-connect:", error);
  process.exit(1);
});

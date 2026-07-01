#!/usr/bin/env node
/**
 * Smoke-test lab-connect tools without Claude Desktop.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... LAB_CONNECT_USER_ID=... node scripts/verify-tools.mjs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "build", "index.js");

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "LAB_CONNECT_USER_ID"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
  env: {
    ...process.env,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    LAB_CONNECT_USER_ID: process.env.LAB_CONNECT_USER_ID,
  },
});

const client = new Client({ name: "lab-connect-verify", version: "0.1.0" });

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  console.error("Registered tools:", names.join(", "));

  const expected = ["get_recent_recovery", "get_todays_verdict", "get_workouts"];
  for (const name of expected) {
    if (!names.includes(name)) {
      throw new Error(`Missing tool: ${name}`);
    }
  }

  console.error("\n--- get_todays_verdict ---");
  const verdict = await client.callTool({ name: "get_todays_verdict", arguments: {} });
  const verdictText = verdict.content?.find((c) => c.type === "text")?.text || "";
  console.log(verdictText);

  console.error("\n--- get_workouts (7 days) ---");
  const workouts = await client.callTool({
    name: "get_workouts",
    arguments: { days: 7 },
  });
  const workoutsText = workouts.content?.find((c) => c.type === "text")?.text || "";
  console.log(workoutsText);

  console.error("\nAll three tools registered and callable.");
} finally {
  await client.close();
}

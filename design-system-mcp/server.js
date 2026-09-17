import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(__dirname, "tokens.json"), "utf-8"));

const server = new McpServer({
  name: "design-system-server",
  version: "1.0.0",
});

// Resource: full token dump
server.resource(
  "tokens",
  "design-system://tokens",
  { mimeType: "application/json" },
  async () => ({
    contents: [
      {
        uri: "design-system://tokens",
        mimeType: "application/json",
        text: JSON.stringify(tokens, null, 2),
      },
    ],
  })
);

// Tool: resolved specs for one component
server.tool(
  "get_component_specs",
  "Returns exact padding, typography, colors, and state behaviors for a named design-system component.",
  { component: z.string().describe("Component name, e.g. 'button'") },
  async ({ component }) => {
    const key = component.toLowerCase();
    const spec = tokens.components?.[key];

    if (!spec) {
      return {
        content: [
          {
            type: "text",
            text: `No component spec found for "${component}". Available: ${Object.keys(tokens.components || {}).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    // Resolve any {alias} references down to raw values before returning
    const resolveAlias = (val) => {
      if (typeof val !== "string" || !val.startsWith("{")) return val;
      const path = val.slice(1, -1).split(".");
      return path.reduce((acc, k) => acc?.[k], tokens)?.["$value"] ?? val;
    };

    const resolved = JSON.parse(JSON.stringify(spec), (_, v) => resolveAlias(v));

    return {
      content: [{ type: "text", text: JSON.stringify(resolved, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

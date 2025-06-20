import {
  McpServer
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create an MCP server
const server = new McpServer({
  name: "Reincarnate a person with a random message",
  version: "1.0.0",
});

export function reincarnate(name: string): string {
  const messages = [
    `${name}, you have been reincarnated as a wise old owl.`,
    `${name}, you have been reincarnated as a brave lion.`,
    `${name}, you have been reincarnated as a cheerful dolphin.`,
    `${name}, you have been reincarnated as a skilled musician.`,
    `${name}, you have been reincarnated as a gentle panda.`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Reincarnate a person into a new form using a tool
// The tool takes a name as input and returns a message about the reincarnation
// The tool can be used in a prompt or called directly
server.tool(
  "reincarnate",
  "Reincarnate a person into a new form",
  {
    name: z.string().describe("The name of the person to reincarnate"),
  },
  async ({ name }) => ({
    content: [{ type: "text", text: reincarnate(name) }]
  })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
async function main() {
  await server.connect(transport);
}
main();

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export interface ServerOptions {
  name: string;
  version: string;
  readOnly?: boolean;
  disableDestructive?: boolean;
}

export function createServer(options: ServerOptions): McpServer {
  return new McpServer({
    name: options.name,
    version: options.version,
  });
}

export function shouldRegisterTool(
  annotations: ToolAnnotations | undefined,
  options: Pick<ServerOptions, "readOnly" | "disableDestructive">
): boolean {
  if (!annotations) return true;

  if (options.readOnly && !annotations.readOnlyHint) return false;
  if (options.disableDestructive && annotations.destructiveHint) return false;

  return true;
}

export async function runStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function parseArgs(
  argv: string[]
): Pick<ServerOptions, "readOnly" | "disableDestructive"> {
  return {
    readOnly: argv.includes("--read-only"),
    disableDestructive: argv.includes("--disable-destructive"),
  };
}

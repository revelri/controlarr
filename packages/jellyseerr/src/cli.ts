#!/usr/bin/env node
import { ArrClient, parseServiceConfig, createServer, runStdio, parseArgs } from "@controlarr/core";
import { JellyseerrService } from "./service.js";
import { registerJellyseerrTools } from "./tools.js";

const config = parseServiceConfig("JELLYSEERR");
if (!config) {
  console.error("JELLYSEERR_URL and JELLYSEERR_API_KEY must be set");
  process.exit(1);
}

const options = parseArgs(process.argv);
const server = createServer({ name: "controlarr-jellyseerr", version: "0.1.0", ...options });
const svc = new JellyseerrService(new ArrClient(config!.url, config!.apiKey));

registerJellyseerrTools(server, svc, options);
await runStdio(server);

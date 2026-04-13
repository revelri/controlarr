#!/usr/bin/env node
import {
  ArrClient,
  parseServiceConfig,
  createServer,
  runStdio,
  parseArgs,
} from "@controlarr/core";
import { RadarrService } from "./service.js";
import { registerRadarrTools } from "./tools.js";

const config = parseServiceConfig("RADARR");
if (!config) {
  console.error("RADARR_URL and RADARR_API_KEY must be set");
  process.exit(1);
}

const options = parseArgs(process.argv);
const server = createServer({ name: "controlarr-radarr", version: "0.1.0", ...options });
const client = new ArrClient(config!.url, config!.apiKey);
const svc = new RadarrService(client);

registerRadarrTools(server, svc, options);
await runStdio(server);

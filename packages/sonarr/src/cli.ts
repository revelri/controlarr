#!/usr/bin/env node
import {
  ArrClient,
  parseServiceConfig,
  createServer,
  runStdio,
  parseArgs,
} from "@controlarr/core";
import { SonarrService } from "./service.js";
import { registerSonarrTools } from "./tools.js";

const config = parseServiceConfig("SONARR");
if (!config) {
  console.error("SONARR_URL and SONARR_API_KEY must be set");
  process.exit(1);
}

const options = parseArgs(process.argv);
const server = createServer({ name: "controlarr-sonarr", version: "0.1.0", ...options });
const client = new ArrClient(config!.url, config!.apiKey);
const svc = new SonarrService(client);

registerSonarrTools(server, svc, options);
await runStdio(server);

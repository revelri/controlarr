#!/usr/bin/env node
import { ArrClient, parseServiceConfig, createServer, runStdio, parseArgs } from "@controlarr/core";
import { ProwlarrService } from "./service.js";
import { registerProwlarrTools } from "./tools.js";

const config = parseServiceConfig("PROWLARR");
if (!config) {
  console.error("PROWLARR_URL and PROWLARR_API_KEY must be set");
  process.exit(1);
}

const options = parseArgs(process.argv);
const server = createServer({ name: "controlarr-prowlarr", version: "0.1.0", ...options });
const svc = new ProwlarrService(new ArrClient(config!.url, config!.apiKey));

registerProwlarrTools(server, svc, options);
await runStdio(server);

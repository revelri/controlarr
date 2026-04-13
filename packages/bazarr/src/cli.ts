#!/usr/bin/env node
import { ArrClient, parseServiceConfig, createServer, runStdio, parseArgs } from "@controlarr/core";
import { BazarrService } from "./service.js";
import { registerBazarrTools } from "./tools.js";

const config = parseServiceConfig("BAZARR");
if (!config) {
  console.error("BAZARR_URL and BAZARR_API_KEY must be set");
  process.exit(1);
}

const options = parseArgs(process.argv);
const server = createServer({ name: "controlarr-bazarr", version: "0.1.0", ...options });
const svc = new BazarrService(new ArrClient(config!.url, config!.apiKey, { authStyle: "query" }));

registerBazarrTools(server, svc, options);
await runStdio(server);

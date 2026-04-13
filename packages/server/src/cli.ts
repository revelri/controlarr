#!/usr/bin/env node
import {
  ArrClient,
  parseServiceConfig,
  createServer,
  runStdio,
  parseArgs,
} from "@controlarr/core";
import { RadarrService, registerRadarrTools } from "@controlarr/radarr";
import { SonarrService, registerSonarrTools } from "@controlarr/sonarr";
import { ProwlarrService, registerProwlarrTools } from "@controlarr/prowlarr";
import { BazarrService, registerBazarrTools } from "@controlarr/bazarr";
import { JellyseerrService, registerJellyseerrTools } from "@controlarr/jellyseerr";

const options = parseArgs(process.argv);

// Parse --services flag (comma-separated list of services to enable)
const servicesArg = process.argv.find((a: string) => a.startsWith("--services="));
const enabledServices = servicesArg
  ? new Set(servicesArg.split("=")[1].split(",").map((s: string) => s.trim().toLowerCase()))
  : null; // null means all

function isEnabled(service: string): boolean {
  return enabledServices === null || enabledServices.has(service);
}

const server = createServer({
  name: "controlarr",
  version: "0.1.0",
  ...options,
});

let registered = 0;

// Radarr
if (isEnabled("radarr")) {
  const config = parseServiceConfig("RADARR");
  if (config) {
    const svc = new RadarrService(new ArrClient(config!.url, config!.apiKey));
    registerRadarrTools(server, svc, options);
    registered++;
    console.error("[controlarr] Radarr enabled");
  }
}

// Sonarr
if (isEnabled("sonarr")) {
  const config = parseServiceConfig("SONARR");
  if (config) {
    const svc = new SonarrService(new ArrClient(config!.url, config!.apiKey));
    registerSonarrTools(server, svc, options);
    registered++;
    console.error("[controlarr] Sonarr enabled");
  }
}

// Prowlarr
if (isEnabled("prowlarr")) {
  const config = parseServiceConfig("PROWLARR");
  if (config) {
    const svc = new ProwlarrService(new ArrClient(config!.url, config!.apiKey));
    registerProwlarrTools(server, svc, options);
    registered++;
    console.error("[controlarr] Prowlarr enabled");
  }
}

// Bazarr
if (isEnabled("bazarr")) {
  const config = parseServiceConfig("BAZARR");
  if (config) {
    const svc = new BazarrService(new ArrClient(config!.url, config!.apiKey, { authStyle: "query" }));
    registerBazarrTools(server, svc, options);
    registered++;
    console.error("[controlarr] Bazarr enabled");
  }
}

// Jellyseerr
if (isEnabled("jellyseerr")) {
  const config = parseServiceConfig("JELLYSEERR");
  if (config) {
    const svc = new JellyseerrService(new ArrClient(config!.url, config!.apiKey));
    registerJellyseerrTools(server, svc, options);
    registered++;
    console.error("[controlarr] Jellyseerr enabled");
  }
}

if (registered === 0) {
  console.error(
    "[controlarr] No services configured. Set environment variables:\n" +
      "  RADARR_URL, RADARR_API_KEY\n" +
      "  SONARR_URL, SONARR_API_KEY\n" +
      "  PROWLARR_URL, PROWLARR_API_KEY\n" +
      "  BAZARR_URL, BAZARR_API_KEY\n" +
      "  JELLYSEERR_URL, JELLYSEERR_API_KEY"
  );
  process.exit(1);
}

console.error(`[controlarr] ${registered} service(s) enabled, starting MCP server...`);
await runStdio(server);

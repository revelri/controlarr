import { z } from "zod";

const serviceConfigSchema = z.object({
  url: z
    .string()
    .url()
    .transform((u) => u.replace(/\/+$/, "")),
  apiKey: z.string().min(1),
});

export type ServiceConfig = z.infer<typeof serviceConfigSchema>;

const SERVICE_NAMES = [
  "RADARR",
  "SONARR",
  "PROWLARR",
  "BAZARR",
  "JELLYFIN",
  "JELLYSEERR",
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

export function parseServiceConfig(
  service: ServiceName
): ServiceConfig | null {
  const url = process.env[`${service}_URL`];
  const apiKey = process.env[`${service}_API_KEY`];

  if (!url && !apiKey) return null;

  if (url && !apiKey) {
    throw new Error(
      `${service}_URL is set but ${service}_API_KEY is missing`
    );
  }
  if (!url && apiKey) {
    throw new Error(
      `${service}_API_KEY is set but ${service}_URL is missing`
    );
  }

  return serviceConfigSchema.parse({ url, apiKey });
}

export type AllConfigs = {
  [K in Lowercase<ServiceName>]: ServiceConfig | null;
};

export function parseAllConfigs(): AllConfigs {
  const result: Record<string, ServiceConfig | null> = {};
  for (const name of SERVICE_NAMES) {
    result[name.toLowerCase()] = parseServiceConfig(name);
  }
  return result as AllConfigs;
}

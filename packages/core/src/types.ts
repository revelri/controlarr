import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export const AnnotReadOnly: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

export const AnnotWrite: ToolAnnotations = {
  readOnlyHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const AnnotWriteCreate: ToolAnnotations = {
  readOnlyHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export const AnnotDestructive: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: false,
};

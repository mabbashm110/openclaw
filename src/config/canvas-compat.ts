import path from "node:path";
import { resolveHomeRelativePath } from "../infra/home-dir.js";
import { normalizePluginsConfig, resolveEffectiveEnableState } from "../plugins/config-state.js";
import type { OpenClawConfig } from "./types.openclaw.js";

export type CanvasCompatHostConfig = {
  enabled: boolean;
  root?: string;
  port?: number;
  liveReload?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readHostConfig(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }
  return {
    ...(readBoolean(value.enabled) !== undefined ? { enabled: readBoolean(value.enabled) } : {}),
    ...(readString(value.root) !== undefined ? { root: readString(value.root) } : {}),
    ...(readPositiveInteger(value.port) !== undefined
      ? { port: readPositiveInteger(value.port) }
      : {}),
    ...(readBoolean(value.liveReload) !== undefined
      ? { liveReload: readBoolean(value.liveReload) }
      : {}),
  };
}

function resolveCanvasPluginHost(config?: OpenClawConfig) {
  const canvasEntry = isRecord(config?.plugins?.entries?.canvas)
    ? config.plugins.entries.canvas
    : undefined;
  const pluginConfig = isRecord(canvasEntry?.config) ? canvasEntry.config : undefined;
  return readHostConfig(pluginConfig?.host);
}

function isCanvasPluginEnabled(config?: OpenClawConfig): boolean {
  if (!config) {
    return true;
  }
  return resolveEffectiveEnableState({
    id: "canvas",
    origin: "bundled",
    config: normalizePluginsConfig(config.plugins),
    rootConfig: config,
    enabledByDefault: true,
  }).enabled;
}

export function resolveCanvasCompatHostConfig(params: {
  config?: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
}): CanvasCompatHostConfig {
  const legacyHost = readHostConfig(params.config?.canvasHost);
  const pluginHost = resolveCanvasPluginHost(params.config);
  const enabled =
    params.env?.OPENCLAW_SKIP_CANVAS_HOST === "1"
      ? false
      : isCanvasPluginEnabled(params.config) &&
        (pluginHost.enabled ?? legacyHost.enabled) !== false;
  return {
    ...legacyHost,
    ...pluginHost,
    enabled,
  };
}

export function resolveCanvasCompatRootDir(params: {
  config?: OpenClawConfig;
  stateDir: string;
  env?: NodeJS.ProcessEnv;
}): string {
  const configured = resolveCanvasCompatHostConfig({
    config: params.config,
    env: params.env,
  }).root?.trim();
  if (configured) {
    return path.resolve(resolveHomeRelativePath(configured, { env: params.env }));
  }
  return path.resolve(path.join(params.stateDir, "canvas"));
}

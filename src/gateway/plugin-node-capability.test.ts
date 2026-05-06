import { describe, expect, test } from "vitest";
import {
  buildPluginNodeCapabilityScopedHostUrl,
  hasAuthorizedPluginNodeCapability,
  normalizePluginNodeCapabilityScopedUrl,
  setClientPluginNodeCapability,
} from "./plugin-node-capability.js";
import type { GatewayWsClient } from "./server/ws-types.js";

function makeClient(
  overrides: Partial<GatewayWsClient> & {
    pluginNodeCapabilities?: GatewayWsClient["pluginNodeCapabilities"];
  } = {},
): GatewayWsClient {
  return {
    socket: {} as GatewayWsClient["socket"],
    connect: {
      role: "node",
      client: {
        mode: "node",
      },
    } as GatewayWsClient["connect"],
    connId: "node-1",
    usesSharedGatewayAuth: false,
    ...overrides,
  };
}

describe("plugin node capability helpers", () => {
  test("builds scoped host urls from clean base urls", () => {
    expect(
      buildPluginNodeCapabilityScopedHostUrl(
        "http://127.0.0.1:18789/root/?debug=1#hash",
        "token value",
      ),
    ).toBe("http://127.0.0.1:18789/root/__openclaw__/cap/token%20value");
    expect(buildPluginNodeCapabilityScopedHostUrl("not a url", "token")).toBeUndefined();
    expect(buildPluginNodeCapabilityScopedHostUrl("http://127.0.0.1:18789", " ")).toBeUndefined();
  });

  test("normalizes scoped urls and moves capability into the query string", () => {
    const normalized = normalizePluginNodeCapabilityScopedUrl(
      "/__openclaw__/cap/token%20value/__openclaw__/canvas/file.txt?download=1",
    );
    expect(normalized).toEqual({
      pathname: "/__openclaw__/canvas/file.txt",
      capability: "token value",
      rewrittenUrl: "/__openclaw__/canvas/file.txt?download=1&oc_cap=token+value",
      scopedPath: true,
      malformedScopedPath: false,
    });
  });

  test("marks malformed scoped urls without authorizing a path capability", () => {
    const normalized = normalizePluginNodeCapabilityScopedUrl("/__openclaw__/cap/broken");
    expect(normalized.scopedPath).toBe(true);
    expect(normalized.malformedScopedPath).toBe(true);
    expect(normalized.capability).toBeUndefined();
    expect(normalized.rewrittenUrl).toBeUndefined();
  });

  test("stores capabilities per plugin surface", () => {
    const client = makeClient();
    setClientPluginNodeCapability({
      client,
      surface: { surface: "canvas" },
      capability: "canvas-token",
      expiresAtMs: 100,
    });
    setClientPluginNodeCapability({
      client,
      surface: { surface: "files" },
      capability: "files-token",
      expiresAtMs: 200,
    });
    expect(client.pluginNodeCapabilities).toEqual({
      canvas: { capability: "canvas-token", expiresAtMs: 100 },
      files: { capability: "files-token", expiresAtMs: 200 },
    });
  });

  test("authorizes matching plugin surface capabilities and slides expiry", () => {
    const client = makeClient({
      pluginNodeCapabilities: {
        canvas: { capability: "canvas-token", expiresAtMs: 1_500 },
      },
    });
    const clients = new Set([client]);
    expect(
      hasAuthorizedPluginNodeCapability({
        clients,
        surface: { surface: "canvas", ttlMs: 100 },
        capability: "canvas-token",
        nowMs: 1_000,
      }),
    ).toBe(true);
    expect(client.pluginNodeCapabilities?.canvas?.expiresAtMs).toBe(1_100);
    expect(
      hasAuthorizedPluginNodeCapability({
        clients,
        surface: { surface: "canvas" },
        capability: "wrong",
        nowMs: 1_000,
      }),
    ).toBe(false);
    expect(
      hasAuthorizedPluginNodeCapability({
        clients,
        surface: { surface: "files" },
        capability: "canvas-token",
        nowMs: 1_000,
      }),
    ).toBe(false);
  });

  test("rejects expired capabilities", () => {
    const client = makeClient({
      pluginNodeCapabilities: {
        canvas: { capability: "canvas-token", expiresAtMs: 999 },
      },
    });
    expect(
      hasAuthorizedPluginNodeCapability({
        clients: new Set([client]),
        surface: { surface: "canvas" },
        capability: "canvas-token",
        nowMs: 1_000,
      }),
    ).toBe(false);
  });
});

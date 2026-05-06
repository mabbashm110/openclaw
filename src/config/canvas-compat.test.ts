import { describe, expect, test } from "vitest";
import { resolveCanvasCompatHostConfig, resolveCanvasCompatRootDir } from "./canvas-compat.js";
import type { OpenClawConfig } from "./types.openclaw.js";

describe("canvas compatibility config", () => {
  test("prefers plugin host config over legacy top-level canvasHost", () => {
    const config: OpenClawConfig = {
      canvasHost: {
        enabled: true,
        root: "~/legacy-canvas",
        port: 1111,
        liveReload: false,
      },
      plugins: {
        entries: {
          canvas: {
            config: {
              host: {
                root: "~/plugin-canvas",
                port: 2222,
                liveReload: true,
              },
            },
          },
        },
      },
    };
    expect(resolveCanvasCompatHostConfig({ config, env: {} })).toEqual({
      enabled: true,
      root: "~/plugin-canvas",
      port: 2222,
      liveReload: true,
    });
  });

  test("honors plugin disablement and skip env", () => {
    const config: OpenClawConfig = {
      plugins: {
        entries: {
          canvas: {
            enabled: false,
            config: {
              host: {
                enabled: true,
              },
            },
          },
        },
      },
    };
    expect(resolveCanvasCompatHostConfig({ config, env: {} }).enabled).toBe(false);
    expect(
      resolveCanvasCompatHostConfig({
        config: { canvasHost: { enabled: true } },
        env: { OPENCLAW_SKIP_CANVAS_HOST: "1" },
      }).enabled,
    ).toBe(false);
  });

  test("resolves plugin root with home fallback and state default", () => {
    const env = { HOME: "/home/tester" };
    expect(
      resolveCanvasCompatRootDir({
        config: {
          plugins: {
            entries: {
              canvas: {
                config: {
                  host: {
                    root: "~/plugin-canvas",
                  },
                },
              },
            },
          },
        },
        stateDir: "/state",
        env,
      }),
    ).toBe("/home/tester/plugin-canvas");
    expect(resolveCanvasCompatRootDir({ stateDir: "/state", env })).toBe("/state/canvas");
  });
});

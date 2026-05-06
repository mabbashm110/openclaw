import type { PluginRegistry } from "../../../plugins/registry.js";
import type { PluginNodeCapabilitySurface } from "../../plugin-node-capability.js";
import type { PluginRoutePathContext } from "./path-context.js";
import { findMatchingPluginHttpRoutes } from "./route-match.js";

type PluginHttpRouteEntry = NonNullable<PluginRegistry["httpRoutes"]>[number];

export type PluginNodeCapabilityRoute = PluginHttpRouteEntry & {
  nodeCapability: PluginNodeCapabilitySurface;
};

function hasNodeCapabilityRoute(route: PluginHttpRouteEntry): route is PluginNodeCapabilityRoute {
  return Boolean(route.nodeCapability?.surface?.trim());
}

export function findMatchingPluginNodeCapabilityRoutes(
  registry: PluginRegistry,
  context: PluginRoutePathContext,
): PluginNodeCapabilityRoute[] {
  return findMatchingPluginHttpRoutes(registry, context).filter(hasNodeCapabilityRoute);
}

export function findMatchingPluginNodeCapabilityRoute(
  registry: PluginRegistry,
  context: PluginRoutePathContext,
): PluginNodeCapabilityRoute | undefined {
  return findMatchingPluginNodeCapabilityRoutes(registry, context)[0];
}

export function listPluginNodeCapabilitySurfaces(registry: PluginRegistry): string[] {
  const surfaces = new Set<string>();
  for (const route of registry.httpRoutes ?? []) {
    const surface = route.nodeCapability?.surface?.trim();
    if (surface) {
      surfaces.add(surface);
    }
  }
  return [...surfaces].toSorted();
}

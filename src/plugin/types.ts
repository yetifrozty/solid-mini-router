import { type SolidAppHooks } from "@yetifrozty/solid-mini-router/plugin";

export function isSolidApp(plugin: any): plugin is SolidAppHooks {
  return "solidRoutes" in plugin;
}
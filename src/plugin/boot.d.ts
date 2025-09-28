declare module "@yetifrozty/solid-mini-router/plugin" {
  export default function minimalRouterPlugin(): import("@yetifrozty/base-plugin-system").BaseHooks & {name: "minimal-router-boot"} & import("@yetifrozty/vite-plugin").ViteHooks & import("@yetifrozty/express-plugin").ExpressHooks;
  export function injectMinimalRouter(plugins: any[]): Promise<void>;
  export interface SolidAppHooks {
    solidRoutes: () => import("solid-js").JSX.Element;
  }
}


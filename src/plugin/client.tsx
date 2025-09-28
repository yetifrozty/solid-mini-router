import { type ClientBaseHooks } from "@yetifrozty/vite-plugin";


interface MiniRouterClientHooks extends ClientBaseHooks {
  name: "mini-router-client";
}

export default function miniRouterClient(): MiniRouterClientHooks {
  let plugins: any[] = [];
  
  return {
    name: "mini-router-client",
    init: async (_plugins) => {
      plugins = _plugins;
    },
    postInit: async () => {
      if (import.meta.env.SSR) {
        return;
      }
      const page = document.getElementById("minimal-routing-page");
      if (!page) {
        return;
      }

      const { hydrate, createComponent } = await import("solid-js/web");

      const Render = await import("./Render.tsx").then(m=>m.default);

      if (page) {
        hydrate(() => <Render plugins={plugins}/>, page);
      }
    }
  }
}
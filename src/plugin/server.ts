import { InitVite, SSRBaseHooks } from "@yetifrozty/vite-plugin";
import { RequestHandler, Router } from "express";
import { Render } from "./Render.tsx";

interface MiniRouterServer extends SSRBaseHooks {
  name: 'mini-router-server';
  getServerMiddleware: () => RequestHandler;
}

export default function miniRouterServer(): MiniRouterServer {
  let plugins: any[] = [];
  let vite: InitVite;
  return {
    name: 'mini-router-server',
    init: async (_plugins, _vite) => {
      plugins = _plugins;
      vite = _vite;
    },
    getServerMiddleware: () => {
      const router = Router();

      router.use((req, res, next) => {
        Render(vite, req, res, plugins, next);
      });

      return router;
    }
  };
}
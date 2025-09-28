import { injectExpress } from "@yetifrozty/express-plugin"
import { injectVite } from "@yetifrozty/vite-plugin"
import { createComponent } from "solid-js"
import solid from "vite-plugin-solid"

/**
 * @type {() => import("@yetifrozty/base-plugin-system").BaseHooks & {name: "livslust-forlag-boot"} & import("@yetifrozty/vite-plugin").ViteHooks & import("@yetifrozty/express-plugin").ExpressHooks}
 */
function minimalRouterPlugin() {
  /**
   * @type {any[]}
   */
  let plugins
  /**
   * @type {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
   */
  let middleware = (req, res, next) => {
    next()
  }

  async function reloadMiddleware() {
    const minimalRouterServerPlugin = plugins.find((plugin) => plugin.name === "mini-router-server")
    if (minimalRouterServerPlugin) {
      middleware = await minimalRouterServerPlugin.getServerMiddleware()
    }
  }

  return {
    name: "mini-router-boot",
    init: async (_plugins) => {
      plugins = _plugins

      // dependencies
      await injectVite(plugins)
      await injectExpress(plugins)
    },
    configureVite: async (vite) => {
      vite.clientPluginModules.push("@yetifrozty/solid-mini-router/plugin/client")
      vite.serverPluginModules.push("@yetifrozty/solid-mini-router/plugin/server")

      if (!vite.config.plugins) vite.config.plugins = []

      if (!vite.config.plugins.find((p) => p.name === "solid")) {
        vite.config.plugins.push(solid({ssr: true}));
      }

      /**
       * @type {import("vite").Plugin}
       */
      const viteHMRPlugin = {
        name: "minimal-router-boot",
        handleHotUpdate: async () => {
          await reloadMiddleware()
        }
      } 

      if (vite.config.plugins) {
        vite.config.plugins.push(viteHMRPlugin)
      }

      return vite
    },
    initVite: async () => {
      await reloadMiddleware()
    },
    initExpress: async (express) => {
      express.set("trust proxy", true)
      express.use((req, res, next) => {
        middleware(req, res, next)
      })      
    }
  }
}

export async function injectMinimalRouter(plugins) {
  if (!plugins.find(p => p.name === "minimal-router-boot")) {
    const minimalRouter = minimalRouterPlugin();
    plugins.push(minimalRouter);
    await minimalRouter.init?.(plugins);
  }
}

export default minimalRouterPlugin
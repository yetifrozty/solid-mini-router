import { createComponent } from "solid-js"
import { type SolidAppHooks } from "@yetifrozty/solid-mini-router/plugin"

export function createSolidApp<Name extends string>(routes: import("solid-js").Component, config: {name: Name}): () => SolidAppHooks & {name: Name} {
  return () => {
    return {
      name: config.name,
      solidRoutes: () => {
        return (
          createComponent(routes, {})
        )
      }
    }
  }
}
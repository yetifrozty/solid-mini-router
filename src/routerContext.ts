import { createContext } from "solid-js";

import { Context } from "solid-js";
import { RouterState } from "./context.ts";

type RouterContext = Context<RouterState | undefined>;

export const RouteContext: { RouterContext: RouterContext } = {
  RouterContext: createContext<RouterState | undefined>(undefined),
};

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    RouteContext.RouterContext = createContext<RouterState | undefined>(undefined);
  });
}
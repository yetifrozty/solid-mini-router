import { createContext, type Context } from "solid-js";
import type { ClientAPI } from "./client.tsx";

type ClientContext = Context<ClientAPI | undefined>;

export const ContextHolder: { Context: ClientContext } = {
  Context: createContext<ClientAPI | undefined>(undefined),
};

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    ContextHolder.Context = createContext<ClientAPI | undefined>(undefined);
  });
}

export default ContextHolder;
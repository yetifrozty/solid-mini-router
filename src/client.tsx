import { Accessor, createEffect, createMemo, createSignal, onCleanup, onMount, untrack, useContext } from "solid-js";
import { type JSX } from "solid-js/jsx-runtime";
import ContextHolder from "./context.ts";
import type { Request, Response } from "express";
import { isServer } from "solid-js/web";

export interface ClientAPI {
  url: URL;
  goto: (url: string, replace?: boolean) => void;
  beforeGoto: (callback: (newPath: string, replace?: boolean) => Promise<void>) => void;
  historyIndex: number;
  scrollEntry: ScrollPosition;
  ssr?: {
    req: Request,
    res: Response
  }
  plugins: any[]
  fetch: typeof fetch
}

interface ScrollPosition {
  x: number;
  y: number;
}

function createClientAPI(plugins: any[]): ClientAPI {
  const getCurrentPath = () => window.location.pathname + window.location.search + window.location.hash;
  const [path, setPath] = createSignal(getCurrentPath());
  if (!isServer) {
    history.scrollRestoration = 'manual';
  }

  const [callbacks, setCallbacks] = createSignal<((newPath: string, replace?: boolean) => Promise<void>)[]>([])

  function goto(newPath: string, replace?: boolean) {
    if (!newPath.startsWith("/") && !newPath.startsWith(window.location.origin)) {
      window.location.assign(newPath);
      return;
    }
    const state = {
      historyIndex: Date.now(),
    };
    if (newPath === path()) {
      return;
    }
    if (replace) {
      history.replaceState(state, '', newPath);
    } else {
      history.pushState(state, '', newPath);
    }
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }

  const getUrlObject = createMemo(() => new URL(path(), window.location.origin));

  const scroll: Record<number, ScrollPosition> = JSON.parse(sessionStorage.getItem("scroll") || "{}");

  const currentHistoryIndex = createMemo(() => {
    getUrlObject();
    return window.history.state?.historyIndex || 0;
  });

  const scrollEntry = createMemo(() => {
    return scroll[currentHistoryIndex()] || {x: 0, y: 0};
  });

  const state = {
    get historyIndex() {
      return currentHistoryIndex();
    },
    get scrollEntry() {
      return scrollEntry();
    },
    set scrollEntry(value: ScrollPosition) {
      scroll[currentHistoryIndex()] = value;
      sessionStorage.setItem("scroll", JSON.stringify(scroll));
    },
    get url() {
      return getUrlObject();
    },
    goto: (newPath: string, replace?: boolean) => {
      goto(newPath, replace)
    },
    beforeGoto: (callback: (newPath: string, replace?: boolean) => Promise<void>) => {
      onMount(() => {
        setCallbacks(callbacks => [...(callbacks || []), callback])
      })
      onCleanup(() => {
        setCallbacks(callbacks => callbacks?.filter(_callback => _callback !== callback))
      })
    },
    plugins,
    fetch: (...args: Parameters<typeof fetch>) => {
      return fetch(...args);
    }
  }

  const update = async (event: PopStateEvent) => {
    const current = window.location.pathname + window.location.search + window.location.hash

    const before = untrack(() => callbacks().map(callback => callback(current)))

    try {
      await Promise.all(before).then(() => {
        const newCurrent = window.location.pathname + window.location.search + window.location.hash
        if (current !== newCurrent) throw new Error("Callback changed the path");

        return
      })
    } catch (error) {
      return;
    }

    scroll[currentHistoryIndex()] = {
      x: window.scrollX,
      y: window.scrollY,
    };
    sessionStorage.setItem("scroll", JSON.stringify(scroll));

    setPath(getCurrentPath());

    await new Promise(r => setTimeout(r, 0));

    window.scrollTo(scrollEntry().x, scrollEntry().y);
  }

  // Listen to back/forward button navigation
  window.addEventListener('popstate', update);
  onCleanup(() => window.removeEventListener('popstate', update));

  return state;
}

function createSSRAPI(url: URL, req: Request, res: Response, plugins: any[]): ClientAPI {
  return {
    url,
    goto: () => {},
    beforeGoto: () => {},
    historyIndex: 0,
    scrollEntry: { x: 0, y: 0 },
    ssr: {
      req,
      res
    },
    plugins,
    fetch: (input, init) => {
      let url: string;
  
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        throw new Error("Invalid input type for fetch");
      }
      const host = req.get('host')?.replace(/\/$/, "")
      // Only prepend origin if not in browser and url is relative
      if (!/^https?:\/\//.test(url) && host) {
        url = req.protocol + "://" + host + (url.startsWith("/") ? url : "/" + url);
      }
      const request = input instanceof Request 
        ? new Request(url, input)
        : new Request(url, init);
  
      const newUrl = new URL(request.url);
      
      if (`.${newUrl.hostname}`.endsWith(`.${req.hostname}`) && request.credentials !== 'omit') {
        const cookie = req.headers.cookie;
        if (cookie) request.headers.set('cookie', cookie);
      }
      
      return fetch(request);
    }
  };
}

export function ErrorScope(props: { children: JSX.Element }) {
  let children: Accessor<JSX.Element | undefined> = createMemo(() => {
    let children: JSX.Element | undefined = undefined;
    try {
      children = props.children;
    } catch (error) {
      console.error('Error in ErrorScope:', error);
      // Preserve the original error stack trace for better debugging
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      
      // In development, also log the component tree for context
      if (import.meta.env.DEV) {
        console.error('Error occurred in component tree. Check the stack trace above for the exact location.');
      }
    }
    return children;
  });
  
  return <>{children()}</>;
}

export function ClientAPIProvider(props: { children: JSX.Element, plugins: any[], req?: Request, res?: Response }) {
  let clientAPI: ClientAPI | undefined = undefined;
  if (!import.meta.env.SSR) {
    clientAPI = createClientAPI(props.plugins);
  } else if (props.req && props.res) {
    const origin = `${props.req?.protocol}://${props.req?.get('host')}`;
    const url = new URL(props.req?.originalUrl || "", origin)
    clientAPI = createSSRAPI(url, props.req!, props.res!, props.plugins)
  } else {
    throw new Error("SSR API requires req and res");
  }
  return <ContextHolder.Context.Provider value={clientAPI}>{props.children}</ContextHolder.Context.Provider>;
}

export function useClientAPI() {
  const context = useContext(ContextHolder.Context);
  if (!context) {
    throw new Error("useClientAPI must be used within a ClientAPIProvider");
  }
  return context;
}
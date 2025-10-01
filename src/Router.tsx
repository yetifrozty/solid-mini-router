

import { type JSX } from "solid-js/jsx-runtime";
import { Accessor, children, Component, createComponent, createEffect, createMemo, createResource, createRoot, createSignal, onCleanup, onMount, ParentComponent, Resource, Show, Suspense, untrack } from "solid-js";
import { isServer } from "solid-js/web";
import { useClientAPI } from "./client.tsx";
import { Request, Response, NextFunction } from "express";

interface EndRouteProps {
  component: Component;
  when?: boolean;
}
interface ParentRouteProps {
  children: JSX.Element;
  when?: boolean;
  layout?: ParentComponent;
}
type RouteProps = EndRouteProps | ParentRouteProps;

const ROUTE = Symbol("route");

type RouteObject = {
  $$type: typeof ROUTE;
  when: boolean;
  children: JSX.Element;
};

interface Root {
  node: JSX.Element;
  dispose: () => void;
  ready: boolean;
  deprecate: () => void;
}

function useRoutes(routes: Accessor<JSX.Element>): Accessor<RouteObject[]> {
  const raw = children(routes);
  
  // Each time the children change (Show toggles, For adds/removes),
  // this memo re-filters them for objects whose $$type === ROUTE.
  const getRoutes = createMemo(() => {
    const ch = raw();
    // children() can return a single item or an array
    const list = Array.isArray(ch) ? ch : [ch];
    return list.filter((n: any): n is RouteObject => n && (n as any).$$type === ROUTE) as unknown as RouteObject[];
  });

  return getRoutes;
}

function useRouter(getRoutes: Accessor<RouteObject[]>): Accessor<RouteObject | null> {
  const getCurrentRouteIndex = () => {
    const routes = getRoutes();
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      if (route.when) {
        return i;
      }
    }
    return null;
  }

  let initialIndex: number | null = isServer ? getCurrentRouteIndex() : null;
  const [routeIndex, setRouteIndex] = createSignal<number | null>(initialIndex);

  const [initialIndexResource] = createResource(() => initialIndex, async (i) => {return i});
  // const initialIndexResource = createMemo(() => initialIndex);
  
  createEffect(() => {
    setRouteIndex(getCurrentRouteIndex());
  });


  const currentRoute = createMemo(() => {
    const index = routeIndex() ?? initialIndexResource();
    if (index == null) {
      return null;
    }
    return getRoutes()[index];
  });
  return currentRoute;
}

function useStaged(currentRoute: Accessor<RouteObject | null>) {
  return createMemo((prev: Root | undefined) => {
    prev?.deprecate();
    let deprecated = false;
    const route = currentRoute();
    if (!route) {return undefined}
    const [ready, setReady] = createSignal<boolean>(false);
    const adopt = async () => {
      if (deprecated) {
        await Promise.resolve(); // prevents infinite loop
        dispose();
        return;
      }
      setReady(true);
    }
    const [resolvedChildren, dispose] = createRoot((dispose) => {
      return [
        (<Suspense fallback={<OnDestroy callback={adopt} />}>{route.children}<InstantResource /></Suspense>),
        dispose
      ]
    })

    return {
      node: resolvedChildren,
      dispose,
      get ready() {
        try {
          return ready();
        } catch (e) {
          return false;
        }
      },
      deprecate: () => {
        deprecated = true;
      }
    }
    
  })

}

function useAdopted(staged: Accessor<Root | undefined>) {
  return createMemo((prev: Root | undefined) => {
    const currentStaged = staged();
    if (!currentStaged) {
      if (prev) prev.dispose(); // optional: clean up when no route
      return undefined;
    }
    if (isServer) {
      return currentStaged;
    }
    if (currentStaged.ready || !prev) {
      if (prev && prev !== currentStaged) prev.dispose(); // don't dispose the same instance
      return currentStaged;
    }
    return prev;
  })
}

function RenderRoute(props: { currentRoute: Accessor<RouteObject | null> }) {
  const staged = useStaged(props.currentRoute);
  const adopted = useAdopted(staged);

  return <>{adopted()?.node}</>
}

function Router(props: { children: JSX.Element, layout?: ParentComponent, onMatchChange?: (matched: boolean) => void }): JSX.Element {
  
  const getRoutes = useRoutes(() => props.children);
  const currentRoute = useRouter(getRoutes);
  const Layout = props.layout || DefaultLayout;

  if (isServer) {
    props.onMatchChange?.(Boolean(currentRoute()));
  }

  createEffect(() => {
    props.onMatchChange?.(Boolean(currentRoute()));
  });

  return <Show when={currentRoute()}>
    <Layout>
      <RenderRoute currentRoute={currentRoute} />
    </Layout>
  </Show>
}

function OnDestroy(props: { callback: () => void }) {
  onCleanup(() => props.callback());
  return <></>;
}

function InstantResource() {
  const [instant] = createResource(async () => null)
  return <>{instant()}</>
}

function EndRoute(props: EndRouteProps): JSX.Element {
  return {
    get children() {
      return <props.component />;
    },
    get when() {
      return props.when ?? true;
    },
    $$type: ROUTE as any,
  } as any;
}

function DefaultLayout(props: { children?: JSX.Element }) {
  return props.children;
}

function ParentRoute(props: ParentRouteProps): JSX.Element {
  let child: JSX.Element;

  const Layout = props.layout || DefaultLayout;
  let matched = false;

  function setMatched(m: boolean) {
    matched = m;
  }

  function getChildren() {
    return <Router onMatchChange={setMatched} layout={Layout}>{props.children}</Router>;
  }

  function initChildren() {
    if (!isServer && child) {
      return;
    }
    child = getChildren();
    return child;
  }

  if (!isServer) {
    child = getChildren();
  }
  
  return {
    get children() {
      initChildren();
      return child;
    },
    get when() {
      if (props.when === false) {
        return false;
      }
      initChildren();
      return matched;
    },
    $$type: ROUTE as any,
  } as any;
}

export { Router, Route };

function Route(props: RouteProps): JSX.Element {
  if ("component" in props) {
    return <EndRoute {...props} />;
  }
  return <ParentRoute {...props} />;
}

export function ServerMiddleware(props: { children: (req: Request, res: Response, next: NextFunction) => void }): JSX.Element {
  const clientAPI = useClientAPI();
  const req = clientAPI.ssr?.req;
  const res = clientAPI.ssr?.res;
  if (!req || !res) {
    return null;
  }

  let resource: Resource<boolean> | undefined;
  const stay = () => !resource?.();
  
  return createComponent(EndRoute, {
    get when() {
      if (resource) {
        return stay();
      }

      const [goNext] = createResource(async () => {
        return new Promise<boolean>((resolve) => {
          let settled = false;
          const resolveOnce = (value: boolean) => {
            if (settled) return;
            settled = true;
            res.off("finish", onFinish);
            res.off("close", onClose);
            res.off("error", onError);
            resolve(value);
          };

          const next = () => resolveOnce(true);
          const onFinish = () => resolveOnce(false);
          const onClose = () => resolveOnce(false);
          const onError = () => resolveOnce(false);

          if (res.headersSent || ("writableEnded" in res && (res as any).writableEnded)) {
            resolveOnce(false);
            return;
          }

          res.once("finish", onFinish);
          res.once("close", onClose);
          res.once("error", onError);
          
          try {
            props.children(req, res, next)
          } catch {
            resolveOnce(false);
          }
        });
      });

      resource = goNext;
      return stay();
    },
    component: () => null,
  });
}
import { type JSX } from "solid-js/jsx-runtime";
import { children, createComponent, createEffect, createMemo, createResource, createRoot, createSignal, onCleanup, onMount, Show, Suspense, untrack } from "solid-js";
import { isServer } from "solid-js/web";

const ROUTE = Symbol("route");

type RouteObject = {
  $$type: typeof ROUTE;
  when: boolean;
  children: JSX.Element;
};

function Routes(props: { children: JSX.Element }): JSX.Element {
  // Solid helper that gives you a function returning the *current* children.
  const raw = children(() => props.children);

  // Each time the children change (Show toggles, For adds/removes),
  // this memo re-filters them for objects whose $$type === ROUTE.
  const getRoutes = createMemo<RouteObject[]>(() => {
    const ch = raw();
    // children() can return a single item or an array
    const list = Array.isArray(ch) ? ch : [ch];
    return list.filter((n: any): n is RouteObject => n && (n as any).$$type === ROUTE) as unknown as RouteObject[];
  });
  
  const currentRoute = createMemo(() => {
    const routes = getRoutes();
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      if (route.when) {
        return route;
      }
    }
    return null;
  }, null, {equals: (a, b) => a === b});

  interface Root {
    node: JSX.Element;
    dispose: () => void;
    ready: boolean;
    deprecate: () => void;
  }

  const staged = createMemo((prev: Root | undefined) => {
    prev?.deprecate();
    let deprecated = false;
    const route = currentRoute();
    if (!route) {return undefined}
    const [ready, setReady] = createSignal<boolean>(false);
    const adopt = async () => {
      if (deprecated) {
        await Promise.resolve();
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

  const adopted = createMemo((prev: Root | undefined) => {
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

  return createMemo(() => {
    const currentAdopted = adopted();
    if (currentAdopted) {
      return currentAdopted.node;
    }
    return null;
  }) as unknown as JSX.Element
}

function OnDestroy(props: { callback: () => void }) {
  onCleanup(() => props.callback());
  return <></>;
}

function InstantResource() {
  const [instant] = createResource(async () => null)
  return <>{instant()}</>
}

function Route(props: { children: JSX.Element, when: boolean }): JSX.Element {
  return {
    get children() {
      return props.children;
    },
    get when() {
      return props.when;
    },
    $$type: ROUTE as any,
  } as any;
}

export { Routes, Route };
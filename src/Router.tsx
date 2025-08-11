import { type JSX } from "solid-js/jsx-runtime";
import { children, createComponent, createEffect, createMemo, createResource, createSignal, onCleanup, Show, Suspense, untrack } from "solid-js";

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

  return createMemo((prev: any) => {
    const route = currentRoute();
    if (!route) {return null}
    const [ready, setReady] = createSignal<boolean>(false);

    const resolvedChildren = <Suspense fallback={<OnDestroy callback={() => {setReady(true)}} />}>{route.children}<InstantResource /></Suspense>

    return createMemo(() => {
      if (ready() || !prev) {
        return resolvedChildren
      }
      return prev
    })
    
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
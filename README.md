# Minimal SolidJS Router

This is a minimal routing library for SolidJS and the plugin system. It is not a full-featured router, but it is small and easy to understand. It supports client-side and server-side rendering.

## Features

-   Minimal API
-   Client-side and Server-side rendering support
-   Scroll position restoration
-   Plugin-system integration (`injectMinimalRouter`)
-   Simple `Route` composition with `when` conditions
-   SSR-aware `fetch` and server-only middleware (`ServerMiddleware`)

## Philosophy

This router is designed to be as simple as possible. There’s no built-in path matching or params; you decide what matches by writing `when` expressions. At runtime the router renders the first `Route` that matches (top-down), and you can nest routes by composing `Route` elements.

## Installation

```sh
npm install @yetifrozty/solid-mini-router
```

## Usage (with the plugin system)

The recommended setup is via the plugin system. Inject the router in your boot plugin, then register client/server apps that declare routes.

### 1) Inject the router in your boot plugin

```ts
// boot.ts / boot.js
import { injectMinimalRouter } from '@yetifrozty/solid-mini-router/plugin';

function myBootPlugin() {
  let plugins = [] as any[];
  return {
    name: 'my-boot',
    init: async (_plugins) => {
      plugins = _plugins;
      await injectMinimalRouter(plugins);
    },
    configureVite: async (vite) => {
      vite.clientPluginModules.push('my-plugin/client');
      vite.serverPluginModules.push('my-plugin/server');
      return vite;
    }
  };
}
export default myBootPlugin;
```

### 2) Declare client routes

```tsx
// client.tsx
import { createSolidApp } from '@yetifrozty/solid-mini-router/plugin/utils';
import { Route } from '@yetifrozty/solid-mini-router/router';
import { useClientAPI } from '@yetifrozty/solid-mini-router';
import Home from './Home';

const clientPlugin = createSolidApp(() => {
  const api = useClientAPI();
  return (
    <Route when={api.url.pathname === '/' || api.url.pathname === ''} component={Home} />
  );
}, { name: 'my-client' });

export default clientPlugin;
```

### 3) Optional: server routes and middleware

```tsx
// server.tsx
import { createSolidApp } from '@yetifrozty/solid-mini-router/plugin/utils';
import { Route, ServerMiddleware } from '@yetifrozty/solid-mini-router/router';
import { useClientAPI } from '@yetifrozty/solid-mini-router';
import { json } from 'express';

function ApiRoute() {
  const api = useClientAPI();
  return (
    <Route when={api.url.pathname === '/api'}>
      <ServerMiddleware>{json()}</ServerMiddleware>
      <ServerMiddleware>{(req, res) => { res.send(req.body?.stuff); }}</ServerMiddleware>
    </Route>
  );
}

const serverPlugin = createSolidApp(() => <ApiRoute />, { name: 'my-server' });
export default serverPlugin;
```

## Optional: standalone usage (without plugin system)

You can also use the primitives directly if you’re not using the plugin system.

```tsx
import { render } from 'solid-js/web';
import { ClientAPIProvider, useClientAPI } from '@yetifrozty/solid-mini-router';
import { Router, Route } from '@yetifrozty/solid-mini-router/router';
import A from '@yetifrozty/solid-mini-router/A';

function App() {
  const api = useClientAPI();
  return (
    <>
      <nav>
        <A href="/">Home</A>
        <A href="/about">About</A>
      </nav>
      <Router>
        <Route when={api.url.pathname === '/'} component={() => <h1>Home</h1>} />
        <Route when={api.url.pathname === '/about'} component={() => <h1>About</h1>} />
      </Router>
    </>
  );
}

render(() => (
  <ClientAPIProvider plugins={[]}> 
    <App />
  </ClientAPIProvider>
), document.getElementById('root')!);
```

## API

### `Route` and `Router` (from `@yetifrozty/solid-mini-router/router`)

-   **`Route`**: Declarative unit with a `when` condition. Use `component={MyComponent}` or nest child `Route`s for grouping. The first matching `Route` renders.
-   **`Router`**: Top-level container that resolves and renders the first matching `Route` in its children tree (used directly in standalone; provided for you in the plugin setup).

### `ServerMiddleware` (from `@yetifrozty/solid-mini-router/router`)

Runs an Express-compatible middleware on the server within a `Route`. If the middleware sends a response, routing short-circuits; otherwise it continues.

### `ClientAPIProvider` and `useClientAPI` (from `@yetifrozty/solid-mini-router`)

Context provider and hook for routing state and helpers.

**Hook returns**
-   `url`: Reactive `URL` for the current location
-   `goto(url, replace?)`: Navigate (client-side). External URLs fall back to `window.location`
-   `beforeGoto(cb)`: Register async guards before navigation
-   `historyIndex`: Reactive history entry id
-   `scrollEntry`: Per-entry scroll position; restored on nav
-   `fetch`: SSR-aware fetch that propagates cookies to same-site requests
-   `ssr?.req`/`ssr?.res`: Express request/response on the server
-   `plugins`: The plugin array

### `A` (default export from `@yetifrozty/solid-mini-router/A`)

Drop-in `<a>` that intercepts same-origin navigations and calls `goto`. Honors modifier keys, right-clicks, `_blank`, external links, and hash links.

### `createSolidApp` (from `@yetifrozty/solid-mini-router/plugin/utils`)

Helper to declare a plugin that contributes Solid routes: `createSolidApp(Component, { name })` → plugin with `solidRoutes()`.

### `injectMinimalRouter` (from `@yetifrozty/solid-mini-router/plugin`)

Ensures the minimal router’s client/server plugins are present and wired into Vite and Express.
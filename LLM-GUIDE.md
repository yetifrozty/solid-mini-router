# Solid Mini Router for LLMs

## Concepts (brief)
- **Plugin injection**: `injectMinimalRouter(plugins)` wires Vite + Express and the router’s client/server plugins.
- **Route matching**: The first `Route` whose `when` evaluates truthy is rendered (top-down). Nesting is supported by composing `Route`s.
- **SSR boundary**: If no route matches during SSR, the renderer calls `next()` so other Express handlers can respond.
- **ServerMiddleware**: Runs Express-style middleware only on the server within a `Route`.
- **Client API**: `useClientAPI()` exposes reactive `url`, `goto`, SSR-aware `fetch`, etc.

## Imports (authoritative)
- `@yetifrozty/solid-mini-router/plugin`: `injectMinimalRouter`
- `@yetifrozty/solid-mini-router/plugin/utils`: `createSolidApp`
- `@yetifrozty/solid-mini-router`: `ClientAPIProvider` (provided by runtime), `useClientAPI`
- `@yetifrozty/solid-mini-router/router`: `Router` (provided by runtime), `Route`, `ServerMiddleware`
- `@yetifrozty/solid-mini-router/A`: default export `A` (enhanced anchor)

## Boot plugin (inject router + register your client/server modules)

```js
// boot.js
import { injectMinimalRouter } from '@yetifrozty/solid-mini-router/plugin';

function myBootPlugin() {
  let plugins: any[] = [];
  return {
    name: 'my-boot',
    init: async (_plugins) => {
      plugins = _plugins;
      await injectMinimalRouter(plugins);
    },
    configureVite: async (vite) => {
      // Replace with your module IDs that export default plugins
      vite.clientPluginModules.push('my-plugin/client');
      vite.serverPluginModules.push('my-plugin/server');
      return vite;
    }
  };
}
export default myBootPlugin;
```

## Client routes plugin

```tsx
// client.tsx
import { createSolidApp } from '@yetifrozty/solid-mini-router/plugin/utils';
import { Route } from '@yetifrozty/solid-mini-router/router';
import { useClientAPI } from '@yetifrozty/solid-mini-router';
import A from '@yetifrozty/solid-mini-router/A';

function Home() {
  return (
    <>
      <h1>Home</h1>
      <A href="/about">About</A>
    </>
  );
}

const clientPlugin = createSolidApp(() => {
  const api = useClientAPI();
  return (
    <>
      <Route when={api.url.pathname === '/' || api.url.pathname === ''} component={Home} />
      <Route when={api.url.pathname === '/about'} component={() => <h1>About</h1>} />
    </>
  );
}, { name: 'my-client' });

export default clientPlugin;
```

## Server routes plugin (middleware + responses)

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
      {/* Parse JSON body, then respond. If you send a response, routing stops. */}
      <ServerMiddleware>{json()}</ServerMiddleware>
      <ServerMiddleware>{(req, res) => { res.send(req.body?.stuff ?? ''); }}</ServerMiddleware>
    </Route>
  );
}

const serverPlugin = createSolidApp(() => <ApiRoute />, { name: 'my-server' });
export default serverPlugin;
```

## Client API
- `api.url`: reactive `URL` of current location.
- `api.goto(path, replace?)`: client-side navigation. External URLs fall back to full-page navigation.
- `api.beforeGoto(cb)`: async guards before route change; throw/return rejected promise to abort.
- `api.historyIndex` + `api.scrollEntry`: per-entry scroll persistence/restoration.
- `api.fetch`: SSR-aware; same-site requests forward `cookie` header from the server request when possible.
- `api.ssr?.req` / `api.ssr?.res`: Express request/response (server only).

## Important notes
- Always `export default` your plugin from `client.tsx` and `server.tsx` created via `createSolidApp`.
- Ensure `configureVite` references the correct module IDs for your client/server plugin modules.

## Minimal file map (example)
```
my-plugin/
  boot.ts            # default export: boot plugin; injectMinimalRouter, configureVite()
  client.tsx         # default export: createSolidApp(() => <Routes/>, { name: 'my-client' })
  server.tsx         # default export: createSolidApp(() => <Routes/>, { name: 'my-server' })
```

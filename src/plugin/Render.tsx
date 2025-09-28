import { catchError, For, JSX, ParentProps, Suspense } from "solid-js";
import { Link, MetaProvider } from "@solidjs/meta";
import { ClientAPIProvider, useClientAPI } from "@yetifrozty/solid-mini-router";
import { Request, Response, NextFunction } from "express";
import { isServer } from "solid-js/web";
import { ErrorBoundary as DefaultErrorBoundary } from "solid-js";
import { InitVite } from "@yetifrozty/vite-plugin";
import { generateHydrationScript, getAssets, hydrate, renderToStringAsync } from "solid-js/web";
import { isSolidApp } from "./types.ts";
import { Router } from "../Router.tsx";



export const ErrorBoundary = (props: ParentProps) => {
  const message = isServer
    ? "500 | Internal Server Error"
    : "Error | Uncaught Client Exception";
  return (
    <DefaultErrorBoundary
      fallback={error => {
        console.error(error);
        return (
          <>
            <span style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">
              {message}
            </span>
          </>
        );
      }}
    >
      {props.children}
    </DefaultErrorBoundary>
  );
};

function Layout(props: {
  req?: Request
  res?: Response
  plugins: any[]
  onMatchChange?: (matched: boolean) => void
}) {
  const relevantPlugins = props.plugins.filter(isSolidApp);
  const solidRoutes = relevantPlugins.map(plugin => plugin.solidRoutes);
  return (
    <ErrorBoundary>
      <ClientAPIProvider plugins={props.plugins} req={props.req} res={props.res}>
        <MetaProvider>
          <Suspense>
            <Router onMatchChange={props.onMatchChange}>
              <For each={solidRoutes}>
                {Route => <Route/>}
              </For>
            </Router>
          </Suspense>
        </MetaProvider>
      </ClientAPIProvider>
    </ErrorBoundary>
  )
}

export async function Render(vite: InitVite, req: Request, res: Response, plugins: any[], next?: NextFunction) {
  let matched = false;
  const body = await renderToStringAsync(() => (
    <Layout req={req} res={res} plugins={plugins} onMatchChange={(m) => { matched = m }} />
  ))
  
  const assets = getAssets()
  const hydrationScript = generateHydrationScript()

  if (res.headersSent) {
    return;
  }
  // If no route matched, allow Express to try the next handler.
  if (!matched) {
    if (next) {
      next();
      return;
    }
  }

  res.send(`<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${await vite.generateHeadContent()}
      ${hydrationScript}
      ${assets}
    </head>
    <body>
      <div id="minimal-routing-page">${body}</div>
    </body>
  </html>`)
}

export default Layout;
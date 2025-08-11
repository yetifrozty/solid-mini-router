# Minimal SolidJS Router

This is a minimal routing library for SolidJS and the plugin system. It is not a full-featured router, but it is small and easy to understand. It supports client-side and server-side rendering.

## Features

-   Minimal API
-   Client-side and Server-side rendering support
-   Scroll position restoration

## Philosophy

This router is designed to be as simple as possible. It does not have a concept of route matching or params. Instead, it provides a `Routes` component that renders the first child `Route` component whose `when` prop is true. This makes the router very flexible and allows you to use any logic you want to determine which route to render.

## Installation

```sh
npm install @yetifrozty/solid-mini-router
```

## Usage

Here is a simple example of how to use the router.

First, you need to wrap your application in the `ClientAPIProvider`. This will provide the routing context to your application.

**index.tsx**
```tsx
import { render } from 'solid-js/web';
import { ClientAPIProvider } from './minimal-routing/src/client';
import App from './App';

render(() => (
  <ClientAPIProvider plugins={[]}>
    <App />
  </ClientAPIProvider>
), document.getElementById('root'));
```

Then, you can use the `Routes`, `Route`, and `A` components in your application.

**App.tsx**
```tsx
import { Routes, Route } from './minimal-routing/src/Router';
import { useClientAPI } from './minimal-routing/src/client';
import A from './minimal-routing/src/A';

function App() {
  const client = useClientAPI();
  const path = () => client.url.pathname;

  return (
    <>
      <nav>
        <A href="/">Home</A>
        <A href="/about">About</A>
        <A href="/contact">Contact</A>
      </nav>
      <Routes>
        <Route when={path() === '/'}>
          <h1>Home</h1>
        </Route>
        <Route when={path() === '/about'}>
          <h1>About</h1>
        </Route>
        <Route when={path() === '/contact'}>
          <h1>Contact</h1>
        </Route>
      </Routes>
    </>
  );
}

export default App;
```

## API

### `ClientAPIProvider`

A context provider that provides the routing context to your application.

**Props**
-   `plugins`: An array of plugins. (Read more at github.com/yetifrozty/base-plugin-system).
-   `req` (SSR only): The Express request object.
-   `res` (SSR only): The Express response object.

### `useClientAPI`

A hook that returns the client API object.

**Returns**
-   `url`: The current URL as a URL object. Reactive.
-   `goto`: A function to navigate to a new URL.
-   `historyIndex`: The current index in the history. Reactive.
-   `scrollEntry`: The scroll position for the current history entry.

### `Routes`

A component that renders the first child `Route` component whose `when` prop is true.

### `Route`

A component that renders its children when its `when` prop is true. Needs to be used directly inside a Routes component.

**Props**
-   `when`: A boolean that determines whether to render the component.
-   `children`: The content to render.

### `A`

A wrapper around the `<a>` tag that uses the router to navigate. It supports all the props of a normal `<a>` tag. 
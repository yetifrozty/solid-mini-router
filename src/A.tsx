import { Show, type JSX } from "solid-js";
import { useClientAPI } from "./client.js";

export interface AProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  replace?: boolean;
}

export default function A(props: AProps) {
  const clientAPI = useClientAPI();
  if (!clientAPI) {
    return <a {...props}>{props.children}</a>;
  }

  const handleClick = (e: MouseEvent) => {
    // Don't handle if modifier keys are pressed or it's a right click
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    
    // Don't handle if target is _blank
    if (props.target === '_blank') {
      return;
    }

    if (props.href == null) {
      return;
    }

    // Don't handle external links or anchor links
    if (props.href.startsWith('http') || props.href.startsWith('//') || props.href.startsWith('#')) {
      return;
    }

    e.preventDefault();
    clientAPI.goto(props.href, props.replace);
  };
  
  return (
    <Show when={props.innerHTML} fallback={
      <a
        {...props}
        href={props.href}
        onClick={handleClick}
        classList={props.classList}
        innerHTML={props.innerHTML}
      >
        {props.children}
      </a>
    }>
      <a
        {...props}
        href={props.href}
        onClick={handleClick}
        classList={props.classList}
      />
    </Show>
  );
} 
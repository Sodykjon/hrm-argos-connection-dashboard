"use client";

import { useEffect, useState } from "react";
import type { Theme } from "./index";

function current(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** The resolved theme, re-rendering when the switch or the OS changes it. */
export function useTheme(): Theme {
  // Lazy init from the DOM: the <head> boot script has already set data-theme,
  // so canvas charts draw in the right palette on their first paint (no dark
  // flash in light). Only option objects depend on this, never markup.
  const [theme, setTheme] = useState<Theme>(current);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(current()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/** Read CSS custom properties for canvas charts (canvas cannot resolve var()). */
export function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

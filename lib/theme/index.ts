// Light / dark theme preference. «system» follows the OS; the choice lives in a
// cookie so the server can render the right `data-theme` without a flash.

export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export const THEME_COOKIE = "hrm_theme";

export function toThemePref(v: string | undefined | null): ThemePref {
  return v === "light" || v === "dark" ? v : "system";
}

/**
 * Runs in <head> before first paint: resolves «system» to light/dark and keeps
 * following the OS while the preference stays «system».
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: light)");function a(){if(d.getAttribute("data-theme-pref")==="system")d.setAttribute("data-theme",m.matches?"light":"dark")}a();m.addEventListener("change",a)}catch(e){}})();`;

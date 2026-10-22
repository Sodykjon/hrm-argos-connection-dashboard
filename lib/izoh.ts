// One free-text note per registry row, written by anyone behind the site gate
// (user, 22.10.2026): the latest text and when it was saved — no history. Keyed by
// orgKey (region|district|name), not the STIR: some STIRs sit on several rows.

export interface Izoh {
  text: string;
  at: string; // ISO time of the last save
}

export interface IzohStore {
  items: Record<string, Izoh>;
}

export const IZOH_MAX = 500;

export type IzohResult =
  | { ok: true; store: IzohStore; izoh: Izoh | null }
  | { ok: false; error: "row" | "long" };

/** Sets (or, for blank text, clears) the note of `key`; `keys` are the registry's row keys. */
export function applyIzoh(
  store: IzohStore,
  key: string,
  text: string,
  at: string,
  keys: ReadonlySet<string>,
): IzohResult {
  if (!keys.has(key)) return { ok: false, error: "row" };
  const t = text.replace(/\r\n?/g, "\n").trim();
  if (t.length > IZOH_MAX) return { ok: false, error: "long" };
  const items = { ...store.items };
  if (!t) {
    delete items[key];
    return { ok: true, store: { items }, izoh: null };
  }
  const izoh = { text: t, at };
  items[key] = izoh;
  return { ok: true, store: { items }, izoh };
}

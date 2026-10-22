import { test } from "node:test";
import assert from "node:assert/strict";
import { applyIzoh, IZOH_MAX, type IzohStore } from "../lib/izoh.ts";

const keys = new Set(["Наманган вилояти|Namangan shahri|A", "Наманган вилояти|Namangan shahri|B"]);
const empty: IzohStore = { items: {} };
const AT = "2026-10-22T07:00:00.000Z";

test("a note is saved trimmed, with its time; another row's note is kept", () => {
  const a = applyIzoh(empty, "Наманган вилояти|Namangan shahri|A", "  yopilgan  ", AT, keys);
  assert.ok(a.ok);
  const b = applyIzoh(a.store, "Наманган вилояти|Namangan shahri|B", "xat yuborildi\r\n2-qator", AT, keys);
  assert.ok(b.ok);
  assert.deepEqual(b.store.items, {
    "Наманган вилояти|Namangan shahri|A": { text: "yopilgan", at: AT },
    "Наманган вилояти|Namangan shahri|B": { text: "xat yuborildi\n2-qator", at: AT },
  });
  // the input store is not changed in place
  assert.deepEqual(a.store.items, { "Наманган вилояти|Namangan shahri|A": { text: "yopilgan", at: AT } });
});

test("blank text clears the note", () => {
  const a = applyIzoh(empty, "Наманган вилояти|Namangan shahri|A", "bor", AT, keys);
  assert.ok(a.ok);
  const b = applyIzoh(a.store, "Наманган вилояти|Namangan shahri|A", "   ", AT, keys);
  assert.ok(b.ok);
  assert.equal(b.izoh, null);
  assert.deepEqual(b.store.items, {});
});

test("an unknown row or an over-long note is refused", () => {
  assert.deepEqual(applyIzoh(empty, "X|Y|Z", "bor", AT, keys), { ok: false, error: "row" });
  const long = "a".repeat(IZOH_MAX + 1);
  assert.deepEqual(applyIzoh(empty, "Наманган вилояти|Namangan shahri|A", long, AT, keys), { ok: false, error: "long" });
  assert.ok(applyIzoh(empty, "Наманган вилояти|Namangan shahri|A", "a".repeat(IZOH_MAX), AT, keys).ok);
});

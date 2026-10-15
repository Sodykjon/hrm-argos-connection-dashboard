import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compute, type BaseFile, type TreeSnapshot } from "../lib/argos-live.ts";
import { buildTree, type SesStructure } from "../lib/argos-live-view.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf-8"));
const base: BaseFile = read("../data/argos-live-base.json");
const ses: SesStructure = read("../data/ses-tuzilma.json");
const tree: TreeSnapshot = read("./fixtures/argos-tree-2026-10-09-full.json");
const result = compute(base.orgs, tree, base.ignoreStir);

test("«SES tuzilmasi»: every SES row of the registry placed once, the republican centre + 14 regions", () => {
  const names = ses.blocks.flatMap((b) => b.rows.map((r) => r.name));
  const inGroup = base.orgs.filter((o) => o.district === ses.group).map((o) => o.name);
  assert.equal(new Set(names).size, names.length, "a row twice");
  assert.deepEqual([...names].sort(), [...inGroup].sort());
  assert.equal(ses.blocks.length, 15);
  assert.equal(ses.blocks[0].name, "markaz");
  for (const b of ses.blocks.slice(1)) {
    assert.equal(b.rows[0].role, "boshqarma", `${b.name} starts with its regional department`);
    assert.equal(b.rows.filter((r) => r.role === "boshqarma").length, 1);
    // departments first, then the committee's direct institutions
    const firstDirect = b.rows.findIndex((r) => r.role === "bevosita");
    if (firstDirect >= 0) assert.ok(b.rows.slice(firstDirect).every((r) => r.role === "bevosita"), b.name);
  }
});

test("the tree shows the SES group in blocks without changing a count", () => {
  const plain = buildTree(result);
  const withSes = buildTree(result, undefined, ses);
  const strip = (rs: ReturnType<typeof buildTree>) =>
    rs.map((r) => ({ ...r, groups: r.groups.map((g) => ({ name: g.name, total: g.total, ulangan: g.ulangan, n: g.orgs.length })) }));
  assert.deepEqual(strip(withSes), strip(plain));

  const g = withSes.flatMap((r) => r.groups).find((x) => x.name === ses.group)!;
  assert.equal(g.blocks?.length, 15);
  assert.equal(g.blocks!.reduce((s, b) => s + b.total, 0), g.total);
  assert.equal(g.blocks!.reduce((s, b) => s + b.ulangan, 0), g.ulangan);
  // rows follow the structure, numbered in that order
  assert.deepEqual(
    g.orgs.map((o) => o.name),
    ses.blocks.flatMap((b) => b.rows.map((r) => r.name)),
  );
  assert.ok(g.orgs.every((o) => o.role));
  // other groups untouched
  assert.ok(withSes.flatMap((r) => r.groups).filter((x) => x !== g).every((x) => !x.blocks));
});

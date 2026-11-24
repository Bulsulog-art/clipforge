/**
 * An in-memory stand-in for the parts of supabase-js the DentVideo jobs use,
 * for tests: tables of plain rows with eq / neq / in / is / like / or filters,
 * select (with count), insert, update, delete, order, limit, and a storage
 * bucket with list / upload / download / remove. Never imported by
 * production code.
 *
 * A select returns whole rows (as it always has), plus any JSON path the
 * column list names, the way PostgREST answers it: "plan->backgrounds" adds
 * `backgrounds`, "photos:plan->backgrounds" adds `photos`, and "->>" gives
 * the value as text. A missing column is reported by its base name ("plan").
 * With `project: true` a select with a column list returns only those
 * columns, as the real database does (opt-in: older tests rely on whole rows).
 */

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

export type MemoryLiman = ReturnType<typeof memoryLiman>;

const cmp = (a: unknown, b: unknown) => String(a ?? "") < String(b ?? "") ? -1 : String(a ?? "") > String(b ?? "") ? 1 : 0;

/** A select column with a JSON path ("alias:col->key->>leaf"); null for a plain column. */
type JsonPath = { alias: string; col: string; keys: string[]; text: boolean };
function jsonPath(token: string): JsonPath | null {
  const m = /^(?:([A-Za-z_][\w]*):)?([A-Za-z_][\w]*)((?:->>?[A-Za-z_][\w]*)+)$/.exec(token);
  if (!m) return null;
  const steps = [...m[3].matchAll(/(->>?)([A-Za-z_][\w]*)/g)];
  const keys = steps.map((x) => x[2]);
  return { alias: m[1] ?? keys[keys.length - 1], col: m[2], keys, text: steps[steps.length - 1][1] === "->>" };
}
function readPath(row: Row, p: JsonPath): unknown {
  let v: unknown = row[p.col];
  for (const k of p.keys) v = v && typeof v === "object" && !Array.isArray(v) ? (v as Row)[k] : undefined;
  if (v === undefined || v === null) return null;
  return p.text && typeof v !== "string" ? JSON.stringify(v) : v;
}

function orFilter(expr: string): Filter {
  const parts = expr.split(",").map((p) => p.trim());
  const tests = parts.map((p): Filter => {
    const m = /^([a-z_]+)\.(not\.)?(eq|is|neq|lt)\.(.+)$/.exec(p);
    if (!m) throw new Error(`memory-liman: unsupported or() part ${p}`);
    const [, col, not, op, raw] = m;
    const val = raw === "null" ? null : raw.replace(/^"(.*)"$/, "$1");
    const base: Filter =
      op === "is" ? (r) => (r[col] ?? null) === val
      : op === "eq" ? (r) => String(r[col]) === String(val)
      : op === "lt" ? (r) => r[col] != null && cmp(r[col], val) < 0
      : (r) => String(r[col]) !== String(val);
    return not ? (r) => !base(r) : base;
  });
  return (r) => tests.some((t) => t(r));
}

export function memoryLiman(seed: Record<string, Row[]> = {}, opts: { missingTables?: string[]; missingColumns?: Record<string, string[]>; project?: boolean } = {}) {
  const tables = new Map<string, Row[]>(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const files = new Map<string, { size: number; created_at: string }>();
  const log: { table: string; op: string; patch?: unknown; filters: string[] }[] = [];
  const t = (name: string) => tables.get(name) ?? (tables.set(name, []), tables.get(name)!);

  function missingErr(table: string, cols: string[]): { code: string; message: string } | null {
    if (opts.missingTables?.includes(table)) return { code: "42P01", message: `relation "public.${table}" does not exist` };
    const gone = (opts.missingColumns?.[table] ?? []).find((c) => cols.includes(c));
    return gone ? { code: "42703", message: `column ${table}.${gone} does not exist` } : null;
  }

  function query(table: string) {
    const filters: Filter[] = [];
    const described: string[] = [];
    let op: "select" | "update" | "insert" | "delete" = "select";
    let patch: Row | Row[] | null = null;
    let cols: string[] = [];
    let head = false;
    let count = false;
    let order: { col: string; asc: boolean } | null = null;
    let limit = Infinity;
    let returning = false;
    let single: "one" | "maybe" | null = null;

    const run = () => {
      const paths = cols.map(jsonPath).filter((p): p is JsonPath => p !== null);
      const baseCols = cols.map((c) => jsonPath(c)?.col ?? c);
      const err = missingErr(table, [...baseCols, ...(patch && !Array.isArray(patch) ? Object.keys(patch) : []), ...(Array.isArray(patch) ? patch.flatMap((r) => Object.keys(r)) : [])]);
      if (err) return { data: null, error: err, count: null };
      const rows = t(table);
      log.push({ table, op, patch: patch ?? undefined, filters: described });
      if (op === "insert") {
        for (const r of patch as Row[]) rows.push({ id: r.id ?? `${table}-${rows.length + 1}`, ...r });
        return { data: null, error: null };
      }
      let hit = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") {
        for (const r of hit) Object.assign(r, patch);
      } else if (op === "delete") {
        tables.set(table, rows.filter((r) => !hit.includes(r)));
      }
      if (order) hit = [...hit].sort((a, b) => (order!.asc ? 1 : -1) * cmp(a[order!.col], b[order!.col]));
      hit = hit.slice(0, limit);
      const plain = cols.filter((c) => !jsonPath(c));
      const shape = (r: Row): Row => {
        const derived = Object.fromEntries(paths.map((p) => [p.alias, readPath(r, p)]));
        if (!opts.project || !cols.length) return { ...r, ...derived };
        return { ...Object.fromEntries(plain.filter((c) => c in r).map((c) => [c, r[c]])), ...derived };
      };
      const data = op === "select" || returning ? hit.map(shape) : null;
      if (single) {
        if (single === "one" && hit.length !== 1) return { data: null, error: { message: "not exactly one row" } };
        return { data: data?.[0] ?? null, error: null };
      }
      return { data: head ? null : data, error: null, count: count ? hit.length : null };
    };

    const q = {
      select(c?: string, o?: { count?: string; head?: boolean }) {
        if (op !== "select") returning = true;
        cols = (c ?? "*").split(",").map((s) => s.trim()).filter((s) => s && s !== "*");
        head = !!o?.head;
        count = !!o?.count;
        return q;
      },
      insert(rows: Row | Row[]) {
        op = "insert";
        patch = Array.isArray(rows) ? rows : [rows];
        return q;
      },
      update(p: Row) {
        op = "update";
        patch = p;
        return q;
      },
      delete() {
        op = "delete";
        return q;
      },
      eq(col: string, v: unknown) {
        described.push(`${col}=${String(v)}`);
        filters.push((r) => r[col] === v);
        return q;
      },
      neq(col: string, v: unknown) {
        described.push(`${col}!=${String(v)}`);
        filters.push((r) => r[col] !== v);
        return q;
      },
      in(col: string, vs: unknown[]) {
        described.push(`${col} in ${vs.join("|")}`);
        filters.push((r) => vs.includes(r[col]));
        return q;
      },
      is(col: string, v: null) {
        described.push(`${col} is ${String(v)}`);
        filters.push((r) => (r[col] ?? null) === v);
        return q;
      },
      gte(col: string, v: string) {
        filters.push((r) => cmp(r[col], v) >= 0);
        return q;
      },
      lt(col: string, v: string) {
        filters.push((r) => cmp(r[col], v) < 0);
        return q;
      },
      like(col: string, pattern: string) {
        const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`);
        filters.push((r) => re.test(String(r[col] ?? "")));
        return q;
      },
      or(expr: string) {
        filters.push(orFilter(expr));
        return q;
      },
      order(col: string, o?: { ascending?: boolean }) {
        order = { col, asc: o?.ascending !== false };
        return q;
      },
      limit(n: number) {
        limit = n;
        return q;
      },
      maybeSingle() {
        single = "maybe";
        return Promise.resolve(run());
      },
      single() {
        single = "one";
        return Promise.resolve(run());
      },
      then<A, B>(ok: (v: ReturnType<typeof run>) => A, bad?: (e: unknown) => B) {
        return Promise.resolve().then(run).then(ok, bad);
      },
    };
    return q;
  }

  const storage = {
    from: () => ({
      async list(prefix: string, o?: { limit?: number; offset?: number }) {
        const names = new Map<string, { name: string; id: string | null }>();
        for (const key of files.keys()) {
          if (!key.startsWith(`${prefix}/`)) continue;
          const rest = key.slice(prefix.length + 1);
          const [first, ...more] = rest.split("/");
          names.set(first, { name: first, id: more.length ? null : key });
        }
        const all = [...names.values()].sort((a, b) => cmp(a.name, b.name));
        const from = o?.offset ?? 0;
        return { data: all.slice(from, from + (o?.limit ?? 100)).map((e) => ({ ...e, metadata: e.id ? { size: files.get(e.id)!.size } : null })), error: null };
      },
      async upload(key: string) {
        files.set(key, { size: 1, created_at: new Date().toISOString() });
        return { error: null };
      },
      async download(key: string) {
        return files.has(key) ? { data: new Blob(["x"]), error: null } : { data: null, error: { message: "not found" } };
      },
      async remove(keys: string[]) {
        for (const k of keys) files.delete(k);
        return { data: keys.map((name) => ({ name })), error: null };
      },
    }),
  };

  return { from: query, storage, tables, files, log, opts, rows: (name: string) => t(name) };
}

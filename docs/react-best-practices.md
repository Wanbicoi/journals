# React Best Practices

House rules for writing React in this repo. Written for the React 19 + OpenTUI client, but the
rules are stack-agnostic and apply to any web, desktop, or TUI target.

This is a **standard, not a description**. The existing code is not the reference implementation —
several files currently violate the rules below. See [Appendix A](#appendix-a--where-this-codebase-deviates)
before citing anything here as "what the codebase does".

---

## 0. Scope and stack facts

| Concern | This repo | Why it matters here |
| :--- | :--- | :--- |
| React | 19 | `ref` as prop, `use()`, Actions, no `forwardRef` |
| Language | TypeScript, `strict` | `any` is a defect, not a shortcut |
| Render target | `@opentui/react` (`<box>`, `<text>`) | No DOM, no CSS, no browser APIs |
| Server state | TanStack Query | The cache is the state (§5) |
| Transport | Hono `hc<AppType>` | Types are shared with the server; keep them honest |
| Formatting | Biome, 2 spaces / double quotes / 100 cols | Non-negotiable, `bun run check` |
| Tests | `bun:test` + renderer test utils | Behavior, not internals (§12) |

Where examples use `<div>`/`<span>`, read `<box>`/`<text>` on the TUI target. Where they use
`onClick`, the TUI equivalent is a key handler. The rules do not change; the host elements do.

House rules — conventions, not virtues — live in [Appendix B](#appendix-b--house-rules-that-are-not-best-practice).

---

## 1. The one rule: derive, don't synchronize

Most React bugs are a second copy of state that fell out of date. Before writing `useState` or
`useEffect`, ask *"can this be computed from something I already have?"*

```tsx
// Bad: two sources of truth, one of them wrong after every mutation.
const [filtered, setFiltered] = useState(entries);
useEffect(() => {
  setFiltered(entries.filter((e) => e.content.includes(query)));
}, [entries, query]);

// Good: one source of truth, recomputed every render (cheap).
const filtered = entries.filter((e) => e.content.includes(query));
```

Keep state for **inputs** (`query`, selection), never for **outputs** (filtered rows, labels,
counts). If the derivation is genuinely expensive — sorting 10k rows, building a chart series —
use `useMemo`, but only after measuring. Filtering a few hundred rows is not expensive.

**Corollary — resetting state when a prop changes.** Use `key`, not an effect:

```tsx
<EditProjectModal key={project.id} project={project} />
```

React discards the old subtree and its state. An effect calling `setName(project.name)` on
`project.id` change renders once with stale values and is a classic flicker bug.

---

## 2. Components

### 2.1 One job, one file, one named export

A component that fetches, formats, and renders three unrelated sections is a *screen*, not a
component. Inside a screen, split by responsibility:

```
components/   dumb and reusable; no data fetching, no transport imports
views/        screens; compose components + hooks, own layout
hooks/        useX: state, queries, keymaps, derived data
api/          transport only
```

If a file needs both a `useQuery` and 200 lines of JSX, it is two files.

### 2.2 Props are an explicit contract

Type props with an `interface` directly above the component. Prefix callbacks with `on`, pass data
as nouns.

```tsx
interface PanelProps {
  title: string;
  width: number;
  theme: ThemePalette;
  borderColor?: string;
  children: React.ReactNode;
}
```

Rules:

- Required props first, optional after, defaults in the destructure (`maxWidth = 72`).
- No boolean flag that selects between two different rendered components — that is two components.
- No `React.FC`: it adds implicit `children`, gains nothing, and fights generics.
- Ambient values (theme, icons, keymaps) may be passed explicitly; §2.6 covers when drilling
  becomes a problem, §2.7 covers context.
- Never accept `any` to dodge a type. Model the union:

```tsx
type Period =
  | { type: "WEEK"; week: string }
  | { type: "MONTH"; month: string };

function label(p: Period) {
  return p.type === "WEEK" ? `W${p.week}` : p.month; // narrowing, no casts
}
```

- **Do not pass a whole container object as a prop.** `journal={journalData}` couples every child to
  every field and every function identity. Pass the three fields the child reads.

### 2.3 Composition beats configuration

If you are adding `showHeader`, `headerTitle`, `headerActions`, and `hideBorder`, take `children`
and slots instead.

```tsx
<Modal theme={theme} width={w} height={h}>
  <ModalHeader title="Filter" onClose={close} />
  <FilterForm onSubmit={apply} />
</Modal>
```

### 2.4 Early returns over nested ternaries

Guards at the top; flat JSX below. A reader should skim indentation and see the shape of the screen.

```tsx
if (loading) return <Spinner />;
if (!entries.length) return <EmptyState message="No entries yet" />;
return <List items={entries} />;
```

Never nest a ternary in a ternary. Extract a named variable or a small component.

### 2.5 Separation of concerns: dependencies point one way

Four layers, one direction:

```
components/  presentation   props in, elements out — no transport, no domain rules
views/       screens        composition + orchestration
hooks/       features       state, data access, side effects — the only layer importing api/
api/         transport      URL, JSON, status codes — no React
core         domain         dates, recurrence, parsing, money — pure, framework-free
```

A layer may import the layer below it, never above.

- **Components do not import `api/`.** No `fetch`, no client, no `fetchXApi` in a component or view.
  Data arrives through a hook (§5).
- **Domain rules do not live in JSX or handlers.** Day rollover, recurrence expansion, debt math,
  and parsing belong in pure modules with their own tests. A date calculation inside `onClick` is
  untestable and duplicated within a month.
- **Handlers orchestrate, they do not compute.** Read state → call one action → report the outcome.

```tsx
// Bad: transport, cache patching, and clock logic in one handler.
async function handleSave() {
  const res = await fetch(`/entries/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
  if (!res.ok) throw new Error(await res.text());
  setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content, updatedAt: Date.now() } : e)));
  setStatus("Saved");
}

// Good: the hook owns transport and invalidation; the screen only orchestrates.
async function handleSave() {
  try {
    await updateEntry(id, draft);
    setStatus("Saved");
  } catch (err) {
    setStatus(message(err));
  }
}
```

Two smells that mean a layer leaked:

- A file imports both a query hook **and** a raw fetcher — it is in two layers at once.
- A component imports global config to read a keymap or theme it should have received as a prop or
  from context (§2.7).

Litmus test: *could this logic run in a test with no renderer at all?* If not, it is presentation
logic in the wrong place.

### 2.6 Prop drilling: usually a misdiagnosis

Drilling is explicit data flow, and explicit is a feature: props are traceable, greppable, and
testable. **Two or three levels is fine. Do not preemptively reach for context.**

The real problems hiding behind "prop drilling":

1. **Pass-through props** — a component receives a prop it never uses, only forwards. Every new need
   edits every intermediate signature: change amplification.
2. **Too many props** — a 15+ prop signature is a component-boundary problem, not a drilling
   problem. Splitting fixes it; context only hides it.
3. **Update-frequency mismatch** — a value that changes per keystroke is drilled through a static
   tree, re-rendering everything on the way down.

Fix in this order, and stop at the first that works:

| # | Move | Applies when |
| :--- | :--- | :--- |
| 1 | **Colocate the state** | Only one subtree needs it — you lifted too early (§3.1) |
| 2 | **Compose instead of forwarding** | A middle component only passes the value along |
| 3 | **Split the component** | One component reads and forwards 10 unrelated things |
| 4 | **Context** | Ambient, read by many leaves, not server data (§2.7) |
| 5 | **External store** | Cross-tree, high-frequency, or needs devtools — name the bug first |

Composition removes the middle layer's knowledge entirely:

```tsx
// The layout knows about `user` only to forward it.
<Layout user={user}>
  <Header user={user} />
  <Body />
</Layout>

// Inverted: the slot is filled above, the layout never sees `user`.
<Layout header={<Header user={user} />}>
  <Body />
</Layout>
```

A prop that appears only inside `...rest`, or is named `data` / `item` / `props`, is a pass-through
in disguise. Fix it at the boundary; do not route around it.

### 2.7 Context: dependency injection for a subtree, not a state manager

Context answers "how does a deep leaf get an ambient value without every ancestor knowing about it".
It is not a cache, not a store, and not a substitute for props.

Use it for values that are **ambient, widely read, and slow-changing**:

| Value | Mechanism |
| :--- | :--- |
| theme, icons, keymaps, feature flags, current user | Context |
| open modal, current tab, selection | Screen state; context only if 3+ depths read it |
| server data | Query cache (it is already context) |
| keystroke, hover, scroll offset, draft text | Local state/ref in the owning component |

Design rules:

- **One provider per concern.** `ThemeProvider`, `KeymapProvider`, `ModalProvider` — never one
  `AppProvider` whose value is `{ everything }`. A god-object re-renders every consumer on any field
  change and brings back the untraceable-props problem.
- **Split state from actions** when consumers need only one: `ThemeContext` (value) and
  `ThemeActionsContext` (stable callbacks) means callback consumers never re-render on a theme
  change.
- **The value must be referentially stable.** Memoize it at the owner, or every provider render
  re-renders every consumer for nothing.
- **Fail loudly outside the provider.** A default value hides a missing provider; a throwing hook
  does not:

  ```tsx
  const ThemeContext = createContext<ThemePalette | null>(null);

  export function ThemeProvider({ value, children }: ThemeProviderProps) {
    return <ThemeContext value={value}>{children}</ThemeContext>; // React 19: no .Provider
  }

  export function useTheme(): ThemePalette {
    const theme = useThemeContext();
    if (!theme) throw new Error("useTheme must be used within <ThemeProvider>");
    return theme;
  }
  ```

- **Never put fast-changing state in context.** Keystrokes, pointer position, and scroll offsets
  belong to the component that consumes them; context makes every consumer a re-render target.
- **Testing gets easier, not harder.** Provide context explicitly in the test wrapper; that wrapper
  doubles as documentation of the ambient dependencies.

The ladder, once more: derive → local state → lifted props → context for ambient → Query for server
→ store only when you can name the bug it fixes.

---

## 3. State

### 3.1 Choose the lowest rung that works

1. **Derived** — compute it. No state.
2. **Local `useState`** — belongs to this component, nobody else.
3. **Lifted state** — two siblings need it; move it to the closest common parent.
4. **Query cache** — it came from the server (§5). The cache is the state.
5. **Config / URL** — must survive reload or be shareable.

Global stores are deliberately absent from this ladder. Server state lives in Query; UI state lives
near the screen that owns it. Add a store only when you can name the concrete bug it fixes.

### 3.2 State identity: ids, not objects, not indices

- **Store the id**, derive the record: `selectedEntryId`, then
  `entries.find((e) => e.id === selectedEntryId)`. Ids survive refetch and reorder.
- **An index is not an identity.** If the array is filtered, sorted, or refetched, the index can
  point past the end (`rows[i]` → `undefined`) or at the wrong row. Indices are acceptable only for
  a static list with no filtering and no deletions.
- Never store the selected *object*: it is a snapshot that goes stale the moment the cache updates.

### 3.3 Keep state minimal and meaningful

- `useState` for one value; `useReducer` when transitions move several values together (wizard
  `step` + `draft` + `errors`). Not for two independent booleans.
- Model lifecycle as a discriminated union, not a set of booleans that can contradict each other:

  ```tsx
  type Status =
    | { kind: "idle" }
    | { kind: "saving"; draft: string }
    | { kind: "failed"; error: string }
    | { kind: "saved"; at: number };
  ```

- Guard `undefined` explicitly; do not let `rows[idx]` flow into a component as if it were defined.
  Clamp, and if nothing is selectable, render the empty state.

### 3.4 Updates are pure

Never mutate state or props. Produce a new object or array:

```tsx
setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content } : e)));
```

In-place mutation "works" until something memoizes, then silently stops re-rendering. Ban `push`,
`splice`, in-place `sort`, and `obj.key = x` on anything from state, props, or the Query cache.

### 3.5 Batch, defer, transition

React 19 batches. For an input filtering a large list, keep the input controlled and defer the
expensive render:

```tsx
const [query, setQuery] = useState("");
const deferred = useDeferredValue(query);
const results = search(deferred);
```

`startTransition` for navigation that must not block typing. **Never** wrap the controlled input's
own `onChange` value in a transition — it must stay synchronous.

### 3.6 Lazy init for expensive defaults

```tsx
const [index] = useState(() => buildIndex(entries)); // runs once, not every render
```

---

## 4. Effects

`useEffect` synchronizes with **systems outside React**: timers, subscriptions, the renderer,
`$EDITOR`, storage, clipboard. If the effect syncs React state with other React state, it is a bug
(§1).

### 4.1 The four legitimate uses

```tsx
// 1. External subscription — always cleans up
useEffect(() => {
  const id = setInterval(poll, 5_000);
  return () => clearInterval(id);
}, [poll]);

// 2. Imperative handle on a non-React object (scroll position, renderer node)
useEffect(() => {
  scrollRef.current?.scrollIntoView(`entry-${selectedId}`);
}, [selectedId]);

// 3. Process/window listener that has no JSX prop
useEffect(() => {
  const onResize = () => setSize(getSize());
  process.on("SIGWINCH", onResize);
  return () => process.off("SIGWINCH", onResize);
}, []);

// 4. One-time signal on mount
useEffect(() => {
  log("view_opened", { view: "timeline" });
}, []);
```

### 4.2 Rules

- **Every subscription returns a cleanup.** StrictMode's double mount exists to expose the leak.
- **Dependencies are honest.** Never lie with `[]`. Anything read and changed belongs in the array.
  If adding it loops, the design is wrong — fix the design, not the array.
- **No `async` effect functions.** React cannot use a promise as cleanup:

  ```tsx
  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal).then(setData);
    return () => ac.abort();
  }, [id]);
  ```

- **Handlers, not effects, for user actions.** "Save when the user clicks Save" is `onClick`.
  "Save whenever `content` changes" is a race with every keystroke.
- **No effect chains.** Effect A setting state read by effect B collapses into one derivation or one
  event handler.
- **Do not put derived collections in state just to feed an effect.** That is §1 wearing a costume.

---

## 5. Server state

Server data is a cache with a lifecycle: freshness, refetch, invalidation, retries. Query owns it;
components read it. Never copy it into `useState`.

### 5.1 Query keys are the cache contract

```tsx
export const queryKeys = {
  entries: ["entries"] as const,
  projects: ["projects"] as const,
  dashboard: (days: number) => ["dashboard", days] as const,
};
```

- Every variable the fetcher reads must be in the key (`dashboard(60)` ≠ `dashboard(30)`).
- Declare keys once, in one file. **Invalidate with the same helper you fetch with** — a literal
  `["dashboard"]` sprinkled through mutations drifts from `queryKeys.dashboard(days)`.
- Never concatenate keys in a component.

### 5.2 Mutations invalidate; they do not hand-patch

```tsx
const mutation = useMutation({
  mutationFn: (input: UpdateEntryInput) => updateEntryApi(input),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
});
```

Invalidation is coarse but correct. Cache patching is an optimization: only after profiling, and
only with an `onMutate` rollback path.

If every mutation invalidates the same five keys, that list should be **one exported constant or one
helper**, not 27 copy-pasted calls. Duplication here drifts silently — add a key in six places, miss
the seventh.

### 5.3 Don't mirror cache data into state

```tsx
// Bad: survives refetch, so deleted rows linger and edits revert.
const [rows, setRows] = useState(query.data ?? []);
```

Read the cache directly: `const rows = query.data ?? []`.

### 5.4 Transport stays typed end-to-end

- Import from one `api/` module. No ad-hoc `fetch` in components.
- **Do not launder responses through `as T`.** `(await fetchEntries()) as Entry[]` is a promise to
  the compiler that a runtime check never verified: a server-side shape change typechecks and
  crashes later. Parse at the boundary (schema validation) or generate the type from the route.
  A cast at the transport edge silently disables the benefit the typed client exists for.

### 5.5 Loading, empty, and error are three different renders

```tsx
if (query.isPending) return <Spinner />;
if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
if (!query.data.length) return <EmptyState message="No projects yet" />;
```

`data ?? []` erases the difference between "loading", "failed", and "empty". Check `isPending` and
`isError` first. **Never** `catch { return null }` inside a `queryFn`: it converts an outage into an
empty screen and destroys the retry. Let the error reach the hook's `isError`.

### 5.6 Polling is not a synchronization strategy

`refetchInterval` is a blunt instrument: it wakes every client, every N seconds, forever. Use it
only for genuinely live data with no push channel. If the server already invalidates on mutation,
adding 5s polling is redundant load that also masks a missing invalidation. When you need
background freshness, prefer explicit invalidation and a single, justified interval.

---

## 6. Refs and imperative escapes

Refs hold values that are not render inputs: renderer handles, timer ids, "previous value"
tracking, focus.

- **Never read or write `ref.current` during render** (except lazy one-time init). It breaks
  concurrent rendering and StrictMode.
- Prefer a callback ref when the node itself matters; use an effect when the side effect must run
  after layout.
- Wrap an imperative API in the smallest component that owns the handle. Do not leak renderer nodes
  up to the screen root.
- React 19 passes `ref` as a normal prop — no `forwardRef`, and `useImperativeHandle` only when a
  parent genuinely needs to call into a child.

---

## 7. Performance

**Measure before optimizing.** React DevTools → Profiler → record the interaction → find the
component that actually commits. Blind `memo`/`useCallback` adds code and allocations, and often
makes things slower.

Leverage order, highest first:

1. **Fix the state shape.** State lifted too high re-renders the whole screen.
2. **Split context providers** per concern (§2.7); a theme change must not re-render cache
   consumers or keystroke handlers.
3. **Virtualize long lists.** Timelines grow without bound; render a window, not 10k nodes.
4. **`useDeferredValue` for filter inputs** (§3.5).
5. **Stable identities where they matter.** `useCallback` only for `memo` children and dependencies;
   `useMemo` only for expensive derivations or referentially-compared props.
6. **`memo` at boundaries receiving stable props** — usually a row, not every component.

Never cache in module scope. Module-level mutable state shared across instances is a bug waiting for
the second mount.

---

## 8. Lists and keys

```tsx
{entries.map((entry) => (
  <EntryRow key={entry.id} entry={entry} />
))}
```

- Keys must be stable, unique, and from the data (`id`). Index keys break reorder, delete, and
  insert; acceptable only for a static, never-reordered list.
- Never generate keys during render (`key={Math.random()}`) — the subtree remounts every render.
- Keys belong on the array element, not a wrapper inside it.
- Composite keys (`${dateStr}-${entryId}`) are fine when rows repeat across groups.

---

## 9. Types

- **`any` is a defect; `unknown` + narrowing is the answer.** `as` is a last resort and needs a
  comment naming the invariant the compiler cannot see.
- **Discriminated unions for state machines**, with an exhaustiveness check:

  ```tsx
  default: {
    const _exhaustive: never = period;
    return _exhaustive;
  }
  ```

- **`satisfies` over annotation** when literal types must survive:

  ```tsx
  const keymaps = { up: "k", down: "j" } satisfies Record<string, string>;
  ```

- **Derive prop types from their owner**: `ComponentProps<typeof Header>`,
  `Awaited<ReturnType<typeof fetchEntries>>`. Duplicating a shape is how two definitions drift.
- **`enum` is out.** String-literal unions serialize, tree-shake, and narrow better.
- **Export types next to the runtime owner**, not from a barrel that re-exports everything.

---

## 10. Async and errors

- **No floating promises.** `void promise` when intentionally fire-and-forget; `await` in
  `try/catch` when the UI must react. An un-awaited `await`-less call inside a `void` handler is a
  silent failure.
- **Not even the process-exit path belongs in a component.** `process.exit(0)` in a keyboard
  handler kills the app mid-render and bypasses cleanup. Emit intent (`onQuit`) and let the entry
  point own process lifecycle.
- **User actions report their own failure.** Status message, toast, error banner — a silent
  rejection is indistinguishable from a no-op.
- **Guard races.** Pass an `AbortSignal`, or check a generation id before applying a stale response.
- **Error boundaries around screens, not every leaf.** One boundary per view keeps the app usable
  when a panel throws. In a TUI, a thrown error tears down the render tree.
- **Fail loudly in development, degrade gracefully in production.** No empty `catch {}`.

```tsx
async function handleSave() {
  try {
    await onSave(entry.id, draft);
    onStatusMessage("Saved");
  } catch (err) {
    onStatusMessage(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
```

---

## 11. Hooks

- One concern per hook, named for the concern: `useSuggestions`, `useModalManager`. If the name
  needs "and", split it.
- Hooks may return objects, but the shape must be stable between renders, and the hook must not
  return a new function identity every render to consumers that depend on it.
- A hook that subscribes must clean up; a hook that queries must not duplicate keys.
- No conditional hooks, no hooks in loops, no hooks after an early return.
- **A hook is not a place to hide a container.** Returning `{ entries, projects, tags, dashboard,
  loading, quickCapture, createProject, updateProject, ... }` produces a god-object that re-renders
  every consumer on every render and makes props untraceable. Return the specific slice the
  consumer needs, from a hook named for that slice.
- Module-level clients are explicit imports, not hook state.

---

## 12. Testing

Test behavior the user can observe, not implementation details.

- **Arrange with domain types and small factories**, not 40-line literals per test.
- **Drive it like a user**: render, send keys/clicks, assert on visible output. A keymap test
  asserts *key → visible state change*, not that an internal handler was called.
- **No snapshot tests.** They pass when behavior breaks and fail when formatting changes.
- **One behavior per test, named as a sentence**:
  `"j moves selection down and clamps at the end"`.
- **Fake timers for time**, never `sleep(500)`.
- **Cover the guard**: empty list, out-of-range selection, failed mutation, stale response.

---

## 13. Interaction details that separate senior work

- **Keyboard parity.** Every mouse-reachable action has a key, and an `isActive` gate keeps
  background views from stealing keystrokes.
- **Focus is state.** Opening a modal moves focus; closing restores it. Never leave focus on a
  destroyed node.
- **Every async action has a pending affordance** and disables its own trigger. Double-submit is a
  data bug, not a UX nit.
- **Destructive actions confirm, then offer undo.** Prefer undo over a modal when reversible.
- **Empty states say what to do next**, not just "No data".
- **Text is never the only signal.** Pair color with an icon or label (`● DEGRADED`), which also
  keeps the TUI usable on limited palettes.
- **Key matching is one function.** Comparing `key.name`, `key.sequence`, a config value, and a
  hardcoded fallback four ways per binding guarantees inconsistency. Normalize once, then match.

---

## 14. Smells

| Smell | Likely fix |
| :--- | :--- |
| `useEffect` that calls `setState` from other state | Derive during render (§1) |
| `useState` initialized from a prop | `key` on the child, or derive (§1) |
| `useState(query.data)` | Read the cache directly (§5.3) |
| `key={index}` on a mutable list | Use the entity id (§8) |
| Selection stored as an index into a filtered array | Store the id (§3.2) |
| `catch { return null }` in a `queryFn` | Let `isError` handle it (§5.5) |
| `as T` on every API response | Validate at the boundary (§5.4) |
| `refetchInterval` on everything | Invalidate on mutation (§5.6) |
| Four booleans for one lifecycle | Discriminated union (§9) |
| `useCallback` on every function | Only at memo/dependency boundaries (§7) |
| `useMemo` around `a + b` | Delete it |
| Disabled `exhaustive-deps` | Fix the dependency or the design (§4.2) |
| `as any` to pass props | Fix the prop type |
| A whole service object as a prop | Pass the fields the child reads (§2.2) |
| A component importing `api/` or a fetcher | Move it into a hook (§2.5) |
| Date / recurrence / debt math inside a handler | Pure function in `core` (§2.5) |
| 15+ props, most of them forwarded unused | Split the component and compose (§2.6) |
| `AppProvider value={{ everything }}` | One provider per concern (§2.7) |
| Keystroke / hover / scroll state in context | Local state in the owning component (§2.7) |
| `catch {}` | Report to the user (§10) |
| 300-line screen with routing, keymaps, undo, and `process.exit` | Extract hooks and screens (§2.1) |

---

## 15. PR checklist

- [ ] Nothing derivable is stored; no duplicated server data
- [ ] Selection is by id, not index into a filtered list
- [ ] Effects only touch external systems; every subscription cleans up
- [ ] Dependency arrays are honest; no disabled lint rules
- [ ] Lists use stable ids as keys
- [ ] Loading, empty, and error each render deliberately
- [ ] No `catch {}` and no `catch { return null }` in fetchers
- [ ] Async handlers catch and surface failures; no floating promises
- [ ] No `as T` laundering of transport responses
- [ ] Props are typed interfaces; no `any`, no casts without a comment
- [ ] No whole-container objects passed as props
- [ ] Components import no transport or global config; data arrives through hooks (§2.5)
- [ ] Domain rules live in pure modules, not handlers or JSX (§2.5)
- [ ] No pass-through props; drilling is explicit and shallow (§2.6)
- [ ] Each context is one concern, its value is memoized, and its hook throws outside the provider (§2.7)
- [ ] Components are named exports with one job
- [ ] User-visible behavior has a test, asserting behavior not internals
- [ ] `bun run check` passes
- [ ] If perf work: before/after Profiler numbers in the description

---

## Appendix A — Where this codebase deviates

Current state, recorded as **debt**, so nobody mistakes it for the standard. Fixing these is
optional per PR, but new code must not copy them.

| Rule | Where | What is wrong | Fix direction |
| :--- | :--- | :--- | :--- |
| §3.2 selection by id | `packages/client-tui/src/views/App.tsx:83` (`filteredEntries[selectedEntryIdx]`) | Index into a filtered array; can select the wrong row or `undefined` after filter/delete/refetch | Store `selectedEntryId`, derive the record, clamp on missing |
| §10 no process control in components | `App.tsx:135,144` | `process.exit(0)` inside a keyboard handler: kills the app mid-render, no cleanup | Emit `onQuit`, own the exit in `index.tsx` |
| §2.1 one job per file | `App.tsx` (294 lines, 10 `useState`s) | Tab routing, keymap dispatch, undo, clipboard, exit, and modal wiring in one component | Extract `useAppKeymaps`, `useUndoDelete`, `useSelectionClipboard` |
| §2.2 no container props | `App.tsx:94` (`journal: journalData`) | Whole service object into `useModalManager`; every consumer rerenders, props untraceable | Pass the specific fields/mutations each modal calls |
| §5.5 errors are a render | `packages/client-tui/src/hooks/useJournalData.ts:26,153-165` | Returned object has `loading` but **no error state**; queries fail silently | Expose `isError`/`error`/`refetch`; render an error state |
| §5.5 no empty catch | `packages/client-tui/src/hooks/queries.ts:124-126` | `catch { return null }` turns an outage into an empty dashboard | Remove the catch; let `isError` surface it |
| §5.4 no `as T` laundering | `queries.ts:90,99,108` | Every response is cast to a type nothing validated | Parse at the boundary or derive the type from the route |
| §5.6 polling is not sync | `queries.ts:91,100,109` | `refetchInterval: 5000` on entries, projects, and tags | Drop to `false`; rely on mutation invalidation |
| §5.2 invalidation helper | `useJournalData.ts` (27 `invalidateQueries` calls) | Five keys copy-pasted per mutation; `["dashboard"]` literal six times | One `invalidateAfterMutation()` + key helper |
| §2.2 prop contracts | `App.tsx:43,57-64` | 10 independent `useState`s for what is a handful of UI machines | Group into reducers or feature hooks |
| §2.5 dependency direction | `views/reflections/ReflectionsView.tsx:6,100,105` | The view imports `fetchPeriodDetailApi` / `saveReflectionApi` and calls them directly while also using query hooks — two layers in one file | Move both behind `useReflectionDetail` and a mutation hook |
| §2.5 no config in presentation | `views/modals/ActiveModal.tsx:2`, `timeline/TimelineView.tsx:5`, `projects/ProjectsView.tsx:5`, `reflections/ReflectionsView.tsx:6` | Views import global `config` for keymaps and appearance instead of receiving them | Props or `KeymapProvider` / `ThemeProvider`; delete `config` imports from views |
| §2.6 prop-count signal | `timeline/TimelineView.tsx` (18 props), `projects/ProjectsView.tsx` (14), `dashboard/DashboardView.tsx` (13) | Every prop is used, but the signatures grow with each new action, and all handlers come from screen-level state in `App.tsx` — the boundary is doing too much, not too little | Split each view into feature components that own their handlers; keep the screen to layout + routing |
| §2.7 context | `packages/client-tui/src` (zero `createContext`) | Theme, icons, and keymaps are drilled from `App` into every view and modal; `config` imports are the workaround | `ThemeProvider` + `KeymapProvider`, then drop the `config` imports |
| §10 error boundaries | `packages/client-tui/src` (none) | A thrown component tears down the whole TUI | One boundary per view |
| §13 key normalization | `App.tsx:140-175`, `TimelineView.tsx` | Each binding compares `key.name`, `key.sequence`, config value, and a hardcoded fallback inline | `matchesBinding(key, "up")` helper |

What **does** hold up and should be preserved: the `isActive` gating of keyboard handlers, the
undo-after-delete flow, derived filtering in `App.tsx`, and the keymap/modal contract tests.

---

## Appendix B — House rules that are not best practice

These are repo constraints and taste calls. Follow them in this codebase; do not present them as
industry guidance.

| Rule | Real reason |
| :--- | :--- |
| Named exports only, no `export default` | Grep-ability and rename refactors. Taste, not correctness. |
| `.js` extensions on relative imports | `tsc` emits native ESM; runtime resolution requires the extension. A build artifact, not a principle. |
| Biome: 2 spaces, double quotes, semicolons, 100 cols | Tooling default. Zero semantic content. |
| `<box>` / `<text>` instead of DOM elements | OpenTUI's renderer. Swapping targets changes elements, not rules. |
| Tests colocated in `__tests__/` | Convention. Plenty of teams keep tests beside sources. |

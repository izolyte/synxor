// The testing ports. Specs and screens depend only on these interfaces, never on
// Vitest, Playwright, Testing Library, or the DOM. Two orthogonal seams:
//   TestKit — the framework seam, crossed by every level.
//   Driver  — the runtime seam, crossed by UI levels; swapping its adapter runs
//             the same scenario as a component test or an E2E test.

// A Selector names what the user perceives, not how the markup is built. Concrete
// selectors live in vocabulary.ts so specs carry no raw strings.

export type Role =
  | "button"
  | "link"
  | "radio"
  | "checkbox"
  | "textbox"
  | "heading"
  | "tab"
  | "option"
  | "status";

// Actionable: a control you can drive and assert on. Readonly: free text you can
// only assert on. The split lets `find` return exactly the right capability.
export type ActionableSelector =
  | { readonly role: Role; readonly name?: string }
  | { readonly label: string }
  | { readonly testId: string };

export type ReadonlySelector = { readonly text: string };

export type Selector = ActionableSelector | ReadonlySelector;

export interface Interactions {
  click(): Promise<void>;
  type(text: string): Promise<void>;
  clear(): Promise<void>;
  press(key: string): Promise<void>;
  focus(): Promise<void>;
  check(): Promise<void>;
}

export interface Assertions {
  shouldBeVisible(): Promise<void>;
  shouldNotExist(): Promise<void>;
  shouldHaveText(text: string): Promise<void>;
  shouldHaveValue(value: string): Promise<void>;
  shouldHaveAttribute(name: string, value?: string | RegExp): Promise<void>;
  shouldBeDisabled(): Promise<void>;
  shouldBeEnabled(): Promise<void>;
  shouldBeChecked(): Promise<void>;
}

export type Element = Interactions & Assertions;

// `find` returns the capability the selector earns: actionable controls get
// interactions, text gets assertions only. `within` scopes queries to a region,
// so the same text in two lists never collides.
export interface Screen {
  find(selector: ActionableSelector): Element;
  find(selector: ReadonlySelector): Assertions;
  within(region: Selector): Screen;
}

// Controls the network a UI sees. Generic: mocks an RPC procedure by name and
// knows nothing about Room or Transfer — the app layer wraps it into a typed,
// domain-named facade.
// resolves/rejects are async so callers can await route registration before
// firing the request — otherwise the request can outrace the mock and hit the
// real backend.
export interface Stub<Output = unknown> {
  resolves(output: Output): Promise<void>;
  rejects(error: { code: string; message?: string }): Promise<void>;
}

export interface BackendMock {
  rpc(procedure: string): Stub;
}

// Client state the app starts from, seeded before the first visit (e.g. a
// remembered theme or session).
export interface SeedState {
  readonly localStorage?: Readonly<Record<string, string>>;
}

// A runnable app you can visit, drive, and whose backend you own.
export interface Driver extends Screen {
  seed(state: SeedState): Promise<void>;
  visit(path: string): Promise<void>;
  readonly backend: BackendMock;
}

// A small, curated assertion surface — enough for our specs, little enough to
// re-point at another runner without reimplementation.
export interface Expectation {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  toMatch(expected: string | RegExp): void;
  toThrow(expected?: string | RegExp): void;
  readonly not: Omit<Expectation, "not">;
}

export type Expect = (actual: unknown) => Expectation;

export interface Mock<Args extends unknown[] = unknown[], Return = unknown> {
  (...args: Args): Return;
  readonly calls: ReadonlyArray<Args>;
}

// The live result of a rendered hook; `current` reflects the latest value across
// re-renders. Vitest-only — Playwright has no hook isolation.
export interface HookResult<T> {
  readonly current: T;
}

// E2E drivers the runtime seam accepts. A new promise-based tool plugs in by
// passing the conformance contract. Cypress is excluded — its command queue can't
// run the shared async contract, and it is single-context.
export type E2eDriver = "playwright" | "selenium" | "webdriverio";

// What a journey spec receives: a Driver and nothing more. Building a domain App
// from it is the app layer's job, so the tool stays business-free.
export interface ScenarioContext {
  readonly driver: Driver;
}

// One adapter per runner; `~test/runtime` resolves to one of these. `scenario`
// wires the adapter's Driver into a test. `renderComponent`/`renderHook` are
// component-level and Vitest-only (Playwright throws).
export interface Runtime {
  suite(name: string, body: () => void): void;
  test(name: string, body: () => unknown | Promise<unknown>): void;
  scenario(name: string, body: (ctx: ScenarioContext) => Promise<void>): void;
  beforeEach(body: () => unknown | Promise<unknown>): void;
  afterEach(body: () => unknown | Promise<unknown>): void;
  renderComponent(ui: unknown): Screen;
  renderHook<T>(hook: () => T): HookResult<T>;
  readonly expect: Expect;
  fn<Args extends unknown[] = unknown[], Return = unknown>(
    impl?: (...args: Args) => Return,
  ): Mock<Args, Return>;
}

# Frontend testing

Two layers: **`kit/`** = the framework-agnostic tool (Driver, Screen, TestKit,
adapters). **`app/`** = synxor's test vocabulary (selectors + copy). Specs import
the tool from `~test/kit`, vocabulary from `~test/app`.

## Test types & convention

| Type | Where | File | Runner |
| --- | --- | --- | --- |
| Unit | beside source | `src/**/*.spec.ts` | Vitest |
| Component | beside source | `src/**/*.spec.tsx` | Vitest (jsdom) |
| Hook | beside source | `src/**/*.spec.tsx` (`renderHook`) | Vitest |
| Integration | `test/scenarios/` | `*.scenario.ts` | Vitest (mocked) |
| E2E | `test/scenarios/` | `*.scenario.ts` (same file) | Playwright |

Smoke isn't a type — it's a minimal test written at whichever level above fits.

**Rules**

- Import only from `~test/kit` (tool) and `~test/app` (vocabulary). Never
  `vitest` / `@playwright/test` in a product spec.
- No raw roles, labels, or copy in specs — add them to `app/vocabulary.ts`.
- No hand-written domain types — infer from the tRPC `AppRouter`.

## Commands

```bash
pnpm test           # unit + component + hook (Vitest)
pnpm test:watch     # Vitest watch
pnpm test:coverage  # + v8 coverage
pnpm test:e2e       # Playwright scenarios (real app)
pnpm test:contract  # adapter conformance (Vitest vs Playwright parity)
```

## Swappable by design

Specs never name a framework, so the runner (Vitest↔Jest↔Mocha) and driver
(Playwright↔Selenium↔Puppeteer) swap via one adapter + the conformance contract
(`conformance/contract.ts`). Ships Vitest + Playwright; the others were each run
green during design, then trimmed. `E2eDriver` (`kit/types.ts`) lists candidates.
Cypress doesn't fit — its command queue can't run the shared async contract.

## Adding capability

The port is intentionally minimal and grows per feature: each feature adds the
methods it needs (port + both adapters, + conformance if cross-tool). Upcoming:
socket mock, file upload / drag-drop, fake timers, clipboard, list count,
keyboard (`tab` / focus), multi-context (two actors).

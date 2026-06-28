// The tool's public surface — domain-agnostic. Specs import the framework-neutral
// primitives from here; synxor vocabulary lives in ~test/app. This folder could
// be lifted into another project unchanged.

import { runtime } from "~test/runtime";

export const suite = runtime.suite;
export const test = runtime.test;
export const scenario = runtime.scenario;
export const beforeEach = runtime.beforeEach;
export const afterEach = runtime.afterEach;
export const renderComponent = runtime.renderComponent;
export const renderHook = runtime.renderHook;
export const expect = runtime.expect;
export const fn = runtime.fn;

export type {
  ActionableSelector,
  BackendMock,
  Driver,
  E2eDriver,
  Element,
  ReadonlySelector,
  ScenarioContext,
  Screen,
  SeedState,
  Selector,
  Stub,
} from "./types";

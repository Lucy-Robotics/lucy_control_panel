/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
const globals = globalThis as unknown as Record<string, unknown>;
for (const key of Object.getOwnPropertyNames(dom.window)) {
    if (!(key in globalThis)) globals[key] = (dom.window as unknown as Record<string, unknown>)[key];
}
globals.window = dom.window;
dom.window.matchMedia ??= () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList;
(dom.window as unknown as Record<string, unknown>).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
globals.ResizeObserver = (dom.window as unknown as Record<string, unknown>).ResizeObserver;
globals.IS_REACT_ACT_ENVIRONMENT = true;

const React = await import('react');
const { createRoot } = await import('react-dom/client');

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const act = React.act;

export async function waitFor(check: () => boolean, timeoutMs = 3000): Promise<boolean> {
    for (let waited = 0; waited < timeoutMs; waited += 50) {
        if (check()) return true;
        await act(() => wait(50));
    }
    return check();
}

export async function render(element: React.ReactElement) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(element));
    return {
        container,
        rerender: (next: React.ReactElement) => act(async () => root.render(next)),
        unmount: () => act(async () => root.unmount()),
    };
}

export async function renderHook<P, R>(hook: (props: P) => R, props: P) {
    const result: { current: R } = { current: undefined as R };
    const Probe = (probeProps: { hookProps: P }) => {
        result.current = hook(probeProps.hookProps);
        return null;
    };
    const view = await render(React.createElement(Probe, { hookProps: props }));
    return {
        result,
        rerender: (next: P) => view.rerender(React.createElement(Probe, { hookProps: next })),
        unmount: view.unmount,
    };
}

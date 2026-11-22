/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSyncExternalStore } from 'react';

let overrides: ReadonlyMap<string, number> = new Map();
const listeners = new Set<() => void>();

function publish(next: ReadonlyMap<string, number>) {
    overrides = next;
    listeners.forEach((listener) => listener());
}

export const overheatMock = {
    get: () => overrides,
    set: (joint: string, celsius: number) => publish(new Map(overrides).set(joint, celsius)),
    clear: () => publish(new Map()),
    subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
};

export function useOverheatMock(): ReadonlyMap<string, number> {
    return useSyncExternalStore(overheatMock.subscribe, overheatMock.get);
}

export function withOverheatMock(
    real: ReadonlyMap<string, number>,
    mock: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
    return mock.size === 0 ? real : new Map([...real, ...mock]);
}

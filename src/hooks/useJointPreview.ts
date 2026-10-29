/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

export interface JointPreviewStore {
    get: (name: string) => number | undefined;
    set: (name: string, value: number | null) => void;
    subscribe: (listener: () => void) => () => void;
}

export function createJointPreviewStore(): JointPreviewStore {
    const values = new Map<string, number>();
    const listeners = new Set<() => void>();

    return {
        get: name => values.get(name),
        set: (name, value) => {
            if (value === null ? !values.has(name) : values.get(name) === value) return;
            if (value === null) {
                values.delete(name);
            } else {
                values.set(name, value);
            }
            listeners.forEach(listener => listener());
        },
        subscribe: listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const JointPreviewContext = createContext<JointPreviewStore | null>(null);

const noopSubscribe = () => () => {};

export function useJointPreview(name: string): number | undefined {
    const store = useContext(JointPreviewContext);
    const getSnapshot = useCallback(() => store?.get(name), [store, name]);
    return useSyncExternalStore(store?.subscribe ?? noopSubscribe, getSnapshot);
}

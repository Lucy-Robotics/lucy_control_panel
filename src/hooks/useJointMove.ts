/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

export interface JointMove {
    name: string;
    value: number;
}

export interface JointMoveStore {
    get: () => JointMove | null;
    move: (name: string, value: number) => void;
    release: () => void;
    subscribe: (listener: () => void) => () => void;
}

export function createJointMoveStore(): JointMoveStore {
    let current: JointMove | null = null;
    const listeners = new Set<() => void>();
    const publish = (next: JointMove | null) => {
        current = next;
        listeners.forEach(listener => listener());
    };

    return {
        get: () => current,
        move: (name, value) => publish({ name, value }),
        release: () => publish(null),
        subscribe: listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const JointMoveContext = createContext<JointMoveStore | null>(null);

const noopSubscribe = () => () => {};
const noMove = () => null;

export function useJointMove(store: JointMoveStore | null): JointMove | null {
    return useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.get ?? noMove);
}

export function useMovingValue(name: string): number | undefined {
    const store = useContext(JointMoveContext);
    const getSnapshot = useCallback(() => {
        const current = store?.get();
        return current?.name === name ? current.value : undefined;
    }, [store, name]);
    return useSyncExternalStore(store?.subscribe ?? noopSubscribe, getSnapshot);
}

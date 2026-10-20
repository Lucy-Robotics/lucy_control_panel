/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Display-only joint values previewed while dragging the 3D joint gizmo.
 *
 * Kept out of the joints state on purpose: that state is published to the
 * robot on a timer, while a preview must never be sent. Each slider subscribes
 * to its own joint, so a drag only re-renders the slider it moves.
 */

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

export interface JointPreviewStore {
    get: (name: string) => number | undefined;
    /** `null` clears the preview, letting the slider show its committed value again. */
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

/** Optional: without a provider, previews are simply not shown. */
export const JointPreviewContext = createContext<JointPreviewStore | null>(null);

const noopSubscribe = () => () => {};

/** Previewed value of a joint, in slider units, or undefined when not being dragged. */
export function useJointPreview(name: string): number | undefined {
    const store = useContext(JointPreviewContext);
    const getSnapshot = useCallback(() => store?.get(name), [store, name]);
    return useSyncExternalStore(store?.subscribe ?? noopSubscribe, getSnapshot);
}

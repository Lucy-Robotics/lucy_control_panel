/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSyncExternalStore } from 'react';

function readVisible(storageKey: string): boolean {
    try {
        return localStorage.getItem(storageKey) !== 'false';
    } catch {
        return true;
    }
}

function writeVisible(storageKey: string, visible: boolean): boolean {
    try {
        localStorage.setItem(storageKey, String(visible));
        return true;
    } catch {
        return false;
    }
}

export function storedVisibility(storageKey: string) {
    const listeners = new Set<() => void>();
    let visible = readVisible(storageKey);

    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    return {
        set: (next: boolean): void => {
            visible = next;
            writeVisible(storageKey, next);
            listeners.forEach((listener) => listener());
        },
        useValue: (): boolean => useSyncExternalStore(subscribe, () => visible),
    };
}

/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ghostVisible';
const listeners = new Set<() => void>();

function readStored(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

let visible = readStored();

function store(next: boolean): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, String(next));
        return true;
    } catch {
        return false;
    }
}

export function setGhostVisible(next: boolean): void {
    visible = next;
    store(next);
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useGhostVisible(): boolean {
    return useSyncExternalStore(subscribe, () => visible);
}

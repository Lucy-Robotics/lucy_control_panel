/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const STACK_STATES = ['loading', 'running', 'stopping', 'stopped', 'crashed'] as const;

export type StackState = (typeof STACK_STATES)[number];

export interface StackStatus {
    robot: string;
    status: StackState;
    ready: boolean;
    index: number;
    total: number;
    label: string;
}

export const CORE_STAGES = [
    'Activating environment',
    'Starting Rosbridge',
    'Opening Rosbridge port',
    'Starting config services',
    'Starting control supervisor',
    'Building robot model',
    'Starting controller manager',
    'Activating controllers',
];

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

export function parseStackStatus(json: unknown): StackStatus | null {
    if (typeof json !== 'string') return null;
    try {
        const { robot, status, ready, index, total, label } = JSON.parse(json);
        const isValid = typeof robot === 'string'
            && STACK_STATES.includes(status)
            && typeof ready === 'boolean'
            && isCount(index)
            && isCount(total)
            && index <= total
            && typeof label === 'string';
        return isValid ? { robot, status, ready, index, total, label } : null;
    } catch {
        return null;
    }
}

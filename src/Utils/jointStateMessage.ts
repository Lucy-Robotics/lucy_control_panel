/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type JointPositions = Record<string, number>;

export interface JointStateMessage {
    name: string[];
    position: number[];
}

export function jointPositionsOf({ name, position }: JointStateMessage): JointPositions {
    return Object.fromEntries(name.map((joint, i) => [joint, position[i]]));
}

export function jointStateMessageOf(positions: JointPositions | null): JointStateMessage {
    return { name: Object.keys(positions ?? {}), position: Object.values(positions ?? {}) };
}

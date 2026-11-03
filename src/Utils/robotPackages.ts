/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface RobotList {
    active: string;
    available: string[];
}

const ROBOT_LABELS: Record<string, string> = {
    inmoov_urdf: 'InMoov',
    inmoov_i2_urdf: 'InMoov i2',
    so_arm101_urdf: 'SO-ARM101',
};

export const robotLabel = (robotPackage: string): string => ROBOT_LABELS[robotPackage] ?? robotPackage;

export function parseRobotList(json: unknown): RobotList | null {
    if (typeof json !== 'string') return null;
    try {
        const { active, available } = JSON.parse(json);
        const isNameList = Array.isArray(available) && available.every((name) => typeof name === 'string');
        return typeof active === 'string' && isNameList ? { active, available } : null;
    } catch {
        return null;
    }
}

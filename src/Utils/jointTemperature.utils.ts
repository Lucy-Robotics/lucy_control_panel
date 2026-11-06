/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const TEMPERATURE_INTERFACE = 'temperature';

export interface DynamicJointState {
    joint_names?: string[];
    interface_values?: { interface_names?: string[]; values?: (number | null)[] }[];
}

export function temperaturesByJoint({ joint_names, interface_values }: DynamicJointState): Map<string, number> {
    const byJoint = new Map<string, number>();
    joint_names?.forEach((name, i) => {
        const interfaces = interface_values?.[i];
        const slot = interfaces?.interface_names?.indexOf(TEMPERATURE_INTERFACE) ?? -1;
        const temperature = interfaces?.values?.[slot];
        if (typeof temperature === 'number' && temperature > 0 && Number.isFinite(temperature)) {
            byJoint.set(name, temperature);
        }
    });
    return byJoint;
}

export function formatTemperature(celsius: number): string {
    return `${Math.round(celsius)} °C`;
}

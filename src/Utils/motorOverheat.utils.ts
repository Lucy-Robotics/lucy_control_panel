/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const OVERHEAT_CELSIUS = 40;
export const HARD_LIMIT_CELSIUS = 60;
export const OVERHEAT_REARM_CELSIUS = 38;

export interface OverheatState {
    tripped: ReadonlySet<string>;
    accepted: ReadonlySet<string>;
}

export interface TorqueCommand {
    topic: string;
    data: number[];
}

export const NO_OVERHEAT: OverheatState = { tripped: new Set(), accepted: new Set() };

export function nextOverheatState(state: OverheatState, temperatures: ReadonlyMap<string, number>): OverheatState {
    const tripped = new Set(state.tripped);
    const accepted = new Set(state.accepted);
    temperatures.forEach((celsius, joint) => {
        if (celsius >= HARD_LIMIT_CELSIUS) {
            tripped.add(joint);
            accepted.delete(joint);
        } else if (celsius > OVERHEAT_CELSIUS) {
            if (!accepted.has(joint)) tripped.add(joint);
        } else if (celsius <= OVERHEAT_REARM_CELSIUS) {
            accepted.delete(joint);
        }
    });
    const unchanged = tripped.size === state.tripped.size && accepted.size === state.accepted.size;
    return unchanged ? state : { tripped, accepted };
}

export function jointsAllowedToContinue(state: OverheatState, temperatures: ReadonlyMap<string, number>): string[] {
    return [...state.tripped].filter((joint) => {
        const celsius = temperatures.get(joint);
        return celsius !== undefined && celsius < HARD_LIMIT_CELSIUS;
    });
}

export function acceptOverheat(state: OverheatState, temperatures: ReadonlyMap<string, number>): OverheatState {
    const tripped = new Set(state.tripped);
    const accepted = new Set(state.accepted);
    for (const joint of jointsAllowedToContinue(state, temperatures)) {
        tripped.delete(joint);
        if (temperatures.get(joint)! > OVERHEAT_REARM_CELSIUS) accepted.add(joint);
    }
    return { tripped, accepted };
}

export function torqueTopicOf(trajectoryTopic: string): string {
    const controller = trajectoryTopic.split('/')[1];
    const torqueController = controller.endsWith('_controller')
        ? controller.replace(/_controller$/, '_torque_enable_controller')
        : `${controller}_torque_enable`;
    return `/${torqueController}/commands`;
}

export function torqueCommands(
    controllers: readonly { topic: string; joints: string[] }[],
    tripped: ReadonlySet<string>,
): TorqueCommand[] {
    return controllers.map(({ topic, joints }) => ({
        topic: torqueTopicOf(topic),
        data: joints.map((joint) => (tripped.has(joint) ? 0 : 1)),
    }));
}

/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { jogTarget } from './jogTeleop.ts';
import { nudgeStep, padDirection, pitchedTarget, rolledOpening, steppedTarget } from './gamepadMotion.ts';
import { clawMoved, clawOpenness, restOpening } from './gamepadClaw.ts';
import type { PadInput } from './gamepadLayout.ts';
import type { Vec3 } from './phoneMotion.ts';

export interface Session {
    target: Vec3 | null;
    pitch: number | null;
    rest: number;
    sentClaw: number | null;
    roll: number;
    sentRoll: number | null;
    fine: boolean;
    previous: PadInput | null;
}

export interface ArmNow {
    endEffector: Vec3 | null;
    pitch: number | null;
    claw: () => number;
    roll: () => number;
}

export interface Tick {
    session: Session;
    publish: { target: Vec3; pitch: number | null } | null;
    claw: number | null;
    roll: number | null;
}

export const NEW_SESSION: Session = {
    target: null, pitch: null, rest: 0, sentClaw: null, roll: 0, sentRoll: null, fine: false, previous: null,
};

const isStill = (v: Vec3) => v.every((d) => d === 0);
const newlyPressed = (now: number, before: number | undefined) => (now === before ? 0 : now);

export function gamepadTick(session: Session, input: PadInput, now: ArmNow, dt: number): Tick {
    const fine = input.fine && !session.previous?.fine ? !session.fine : session.fine;
    const nudge = {
        forward: newlyPressed(input.nudge.forward, session.previous?.nudge.forward),
        right: newlyPressed(input.nudge.right, session.previous?.nudge.right),
    };
    const base = { ...session, fine, previous: input };
    const { endEffector } = now;
    if (!input.enable || !endEffector) {
        return { session: { ...base, target: null, pitch: null }, publish: null, claw: null, roll: null };
    }

    const held = session.target !== null;
    const start = held ? session.target! : endEffector;
    const startPitch = held ? session.pitch : now.pitch;
    const rest = restOpening(held ? session.rest : now.claw(), input.open, input.close, dt);
    const sentClaw = held ? session.sentClaw : null;
    const roll = rolledOpening(held ? session.roll : now.roll(), input, fine, dt);
    const sentRoll = held ? session.sentRoll : roll;

    const direction = padDirection(input, fine);
    const step = nudgeStep(nudge, fine);
    let target = start;
    if (!isStill(direction)) target = jogTarget(target, direction, dt, endEffector);
    if (!isStill(step)) target = steppedTarget(target, step, endEffector);
    const pitch = startPitch === null || now.pitch === null
        ? startPitch
        : pitchedTarget(startPitch, input, fine, dt, now.pitch);

    const openness = clawOpenness(rest, input.squeeze);
    const claw = clawMoved(sentClaw, openness) ? openness : null;
    const turned = clawMoved(sentRoll, roll) ? roll : null;
    const moved = target !== start || pitch !== startPitch;
    return {
        session: { ...base, target, pitch, rest, sentClaw: claw ?? sentClaw, roll, sentRoll: turned ?? sentRoll },
        publish: moved ? { target, pitch } : null,
        claw,
        roll: turned,
    };
}

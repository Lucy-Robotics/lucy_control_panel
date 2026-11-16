/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { jogTarget } from './jogTeleop.ts';
import { PAD_MAX_LEAD_M, nudgeStep, padDirection, steppedTarget, turnedOpening } from './gamepadMotion.ts';
import { clawMoved, clawOpenness, restOpening } from './gamepadClaw.ts';
import type { PadInput } from './gamepadLayout.ts';
import type { Vec3 } from './phoneMotion.ts';

export const TIP_UP_LOWERS_WRIST_PITCH = -1;

export interface Session {
    target: Vec3 | null;
    rest: number;
    sentClaw: number | null;
    pitch: number;
    sentPitch: number | null;
    roll: number;
    sentRoll: number | null;
    fine: boolean;
    previous: PadInput | null;
}

export interface ArmNow {
    endEffector: Vec3 | null;
    claw: () => number;
    pitch: () => number;
    roll: () => number;
}

export interface Tick {
    session: Session;
    publish: Vec3 | null;
    claw: number | null;
    pitch: number | null;
    roll: number | null;
}

export const NEW_SESSION: Session = {
    target: null, rest: 0, sentClaw: null, pitch: 0, sentPitch: null, roll: 0, sentRoll: null, fine: false, previous: null,
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
        return { session: { ...base, target: null }, publish: null, claw: null, pitch: null, roll: null };
    }

    const held = session.target !== null;
    const start = held ? session.target! : endEffector;
    const rest = restOpening(held ? session.rest : now.claw(), input.open, input.close, dt);
    const sentClaw = held ? session.sentClaw : null;
    const pitch = turnedOpening(held ? session.pitch : now.pitch(), TIP_UP_LOWERS_WRIST_PITCH * input.pitch, input, fine, dt);
    const sentPitch = held ? session.sentPitch : pitch;
    const roll = turnedOpening(held ? session.roll : now.roll(), input.roll, input, fine, dt);
    const sentRoll = held ? session.sentRoll : roll;

    const direction = padDirection(input, fine);
    const step = nudgeStep(nudge, fine);
    let target = start;
    if (!isStill(direction)) target = jogTarget(target, direction, dt, endEffector, PAD_MAX_LEAD_M);
    if (!isStill(step)) target = steppedTarget(target, step, endEffector);

    const openness = clawOpenness(rest, input.squeeze);
    const claw = clawMoved(sentClaw, openness) ? openness : null;
    const tilted = clawMoved(sentPitch, pitch) ? pitch : null;
    const turned = clawMoved(sentRoll, roll) ? roll : null;
    return {
        session: {
            ...base, target, rest, sentClaw: claw ?? sentClaw,
            pitch, sentPitch: tilted ?? sentPitch, roll, sentRoll: turned ?? sentRoll,
        },
        publish: target === start ? null : target,
        claw,
        pitch: tilted,
        roll: turned,
    };
}

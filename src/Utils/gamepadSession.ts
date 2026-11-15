/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { jogTarget } from './jogTeleop.ts';
import { nudgeStep, stickDirection, steppedTarget } from './gamepadMotion.ts';
import { clawMoved, clawOpenness, restOpening } from './gamepadClaw.ts';
import type { PadInput } from './gamepadLayout.ts';
import type { Vec3 } from './phoneMotion.ts';

export interface Session {
    target: Vec3 | null;
    rest: number;
    sentClaw: number | null;
    fine: boolean;
    previous: PadInput | null;
}

export interface Tick {
    session: Session;
    publish: Vec3 | null;
    claw: number | null;
}

export const NEW_SESSION: Session = { target: null, rest: 0, sentClaw: null, fine: false, previous: null };

const isStill = (v: Vec3) => v.every((d) => d === 0);
const newlyPressed = (now: number, before: number | undefined) => (now === before ? 0 : now);

export function gamepadTick(session: Session, input: PadInput, endEffector: Vec3 | null, clawNow: () => number, dt: number): Tick {
    const fine = input.fine && !session.previous?.fine ? !session.fine : session.fine;
    const nudge = {
        forward: newlyPressed(input.nudge.forward, session.previous?.nudge.forward),
        right: newlyPressed(input.nudge.right, session.previous?.nudge.right),
    };
    const base = { ...session, fine, previous: input };
    if (!input.enable || !endEffector) return { session: { ...base, target: null }, publish: null, claw: null };

    const held = session.target !== null;
    const start = held ? session.target! : endEffector;
    const rest = restOpening(held ? session.rest : clawNow(), input.open, input.close, dt);
    const sentClaw = held ? session.sentClaw : null;

    const direction = stickDirection(input, endEffector, fine);
    const step = nudgeStep(nudge, fine);
    let target = start;
    if (!isStill(direction)) target = jogTarget(target, direction, dt, endEffector);
    if (!isStill(step)) target = steppedTarget(target, step, endEffector);

    const openness = clawOpenness(rest, input.squeeze);
    const claw = clawMoved(sentClaw, openness) ? openness : null;
    return {
        session: { ...base, target, rest, sentClaw: claw ?? sentClaw },
        publish: target === start ? null : target,
        claw,
    };
}

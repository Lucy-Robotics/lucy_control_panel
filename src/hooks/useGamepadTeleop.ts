/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RosBridgeService } from '../Services/ros/ros.service';
import { openIkTopics } from '../Services/ros/ikTopics';
import { subscribeToJointLoads } from '../Services/ros/handlers/DynamicJointState.handler';
import { readPad } from '../Utils/gamepadLayout';
import { NEW_SESSION, gamepadTick } from '../Utils/gamepadSession';
import { rumbleFor } from '../Utils/gamepadRumble';
import { firstGamepad } from './useGamepadConnected';
import type { JointPositions } from '../Utils/jointStateMessage';
import type { Vec3 } from '../Utils/phoneMotion';

const TICK_MS = 50;
const RUMBLE_MS = 120;
export const GRIP_JOINT = 'Jaw';
export const PITCH_JOINT = 'Wrist_Pitch';
export const ROLL_JOINT = 'Wrist_Roll';

export interface GamepadTeleopHooks {
    onSolution: (positions: JointPositions) => void;
    setOpenness: (joint: string, openness: number) => void;
    opennessOf: (joint: string) => number;
    overheated: ReadonlySet<string>;
}

export interface GamepadTeleop {
    isOn: boolean;
    isHeld: boolean;
    isFine: boolean;
    target: Vec3 | null;
    toggle: () => void;
}

function rumble(pad: Gamepad, loads: ReadonlyMap<string, number>, overheated: ReadonlySet<string>) {
    const { weak, strong } = rumbleFor(loads, GRIP_JOINT, overheated);
    if (!pad.vibrationActuator || (weak === 0 && strong === 0)) return false;
    pad.vibrationActuator
        .playEffect('dual-rumble', { duration: RUMBLE_MS, weakMagnitude: weak, strongMagnitude: strong })
        .catch(() => undefined);
    return true;
}

export function useGamepadTeleop(canRun: boolean, endEffector: Vec3 | null, hooks: GamepadTeleopHooks): GamepadTeleop {
    const [isOn, setIsOn] = useState(false);
    const [isHeld, setIsHeld] = useState(false);
    const [isFine, setIsFine] = useState(false);
    const [target, setTarget] = useState<Vec3 | null>(null);
    const endEffectorRef = useRef(endEffector);
    const hooksRef = useRef(hooks);

    useEffect(() => {
        endEffectorRef.current = endEffector;
        hooksRef.current = hooks;
    });

    useEffect(() => {
        if (!canRun) setIsOn(false);
    }, [canRun]);

    const toggle = useCallback(() => setIsOn((on) => !on), []);

    useEffect(() => {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isOn || !ros) return;

        const ik = openIkTopics(ros, (positions) => hooksRef.current.onSolution(positions));
        let loads: ReadonlyMap<string, number> = new Map();
        const stopLoads = subscribeToJointLoads((next) => { loads = next; });
        const pad = firstGamepad();
        let session = { ...NEW_SESSION, previous: pad ? readPad(pad) : null };
        let lastRumble = 0;

        const stop = () => setIsOn(false);
        const onKeyDown = (event: KeyboardEvent) => { if (event.code === 'Escape') stop(); };
        const onHidden = () => { if (document.hidden) stop(); };
        window.addEventListener('blur', stop);

        const tick = setInterval(() => {
            const pad = firstGamepad();
            if (!pad) return stop();
            const { opennessOf, setOpenness } = hooksRef.current;
            const result = gamepadTick(session, readPad(pad), {
                endEffector: endEffectorRef.current,
                claw: () => opennessOf(GRIP_JOINT),
                pitch: () => opennessOf(PITCH_JOINT),
                roll: () => opennessOf(ROLL_JOINT),
            }, TICK_MS / 1000);
            setIsHeld(result.session.target !== null);
            setIsFine(result.session.fine);
            session = result.session;
            if (result.publish) {
                ik.publishTarget(result.publish);
                setTarget(result.publish);
            }
            if (result.claw !== null) setOpenness(GRIP_JOINT, result.claw);
            if (result.pitch !== null) setOpenness(PITCH_JOINT, result.pitch);
            if (result.roll !== null) setOpenness(ROLL_JOINT, result.roll);
            const now = performance.now();
            if (session.target && now - lastRumble >= RUMBLE_MS && rumble(pad, loads, hooksRef.current.overheated)) {
                lastRumble = now;
            }
        }, TICK_MS);

        window.addEventListener('keydown', onKeyDown);
        document.addEventListener('visibilitychange', onHidden);
        return () => {
            clearInterval(tick);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('blur', stop);
            document.removeEventListener('visibilitychange', onHidden);
            stopLoads();
            ik.close();
            setTarget(null);
            setIsHeld(false);
            setIsFine(false);
        };
    }, [isOn]);

    return { isOn, isHeld, isFine, target, toggle };
}

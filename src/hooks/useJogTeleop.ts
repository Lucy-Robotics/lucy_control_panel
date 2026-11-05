/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RosBridgeService } from '../Services/ros/ros.service';
import { openIkTopics } from '../Services/ros/ikTopics';
import { isEditableTarget } from '../Utils/isEditableTarget';
import { isJogCode, jogDirection, jogTarget } from '../Utils/jogTeleop';
import type { JointPositions } from '../Utils/jointStateMessage';
import type { Vec3 } from '../Utils/phoneMotion';

const PUBLISH_PERIOD_MS = 50;

export interface JogTeleop {
    isOn: boolean;
    target: Vec3 | null;
    toggle: () => void;
    press: (code: string) => void;
    release: (code: string) => void;
}

export function useJogTeleop(
    canRun: boolean,
    endEffector: Vec3 | null,
    onSolution: (positions: JointPositions) => void,
): JogTeleop {
    const [isOn, setIsOn] = useState(false);
    const [target, setTarget] = useState<Vec3 | null>(null);
    const endEffectorRef = useRef(endEffector);
    const onSolutionRef = useRef(onSolution);
    const pressedRef = useRef(new Set<string>());

    useEffect(() => {
        endEffectorRef.current = endEffector;
        onSolutionRef.current = onSolution;
    });

    useEffect(() => {
        if (!canRun) setIsOn(false);
    }, [canRun]);

    const toggle = useCallback(() => setIsOn((on) => !on), []);
    const press = useCallback((code: string) => { pressedRef.current.add(code); }, []);
    const release = useCallback((code: string) => { pressedRef.current.delete(code); }, []);

    useEffect(() => {
        const origin = endEffectorRef.current;
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isOn || !origin || !ros) return;

        const pressed = pressedRef.current;
        const ik = openIkTopics(ros, (positions) => onSolutionRef.current(positions));
        let current = origin;
        setTarget(origin);

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                setIsOn(false);
                return;
            }
            if (!isJogCode(event.code) || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return;
            event.preventDefault();
            pressed.add(event.code);
        };
        const onKeyUp = (event: KeyboardEvent) => {
            if (pressed.delete(event.code)) event.preventDefault();
        };
        const stop = () => setIsOn(false);
        const tick = setInterval(() => {
            const direction = jogDirection(pressed);
            const endEffectorNow = endEffectorRef.current;
            if (!endEffectorNow || direction.every((d) => d === 0)) return;
            current = jogTarget(current, direction, PUBLISH_PERIOD_MS / 1000, endEffectorNow);
            ik.publishTarget(current);
            setTarget(current);
        }, PUBLISH_PERIOD_MS);

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', stop);
        return () => {
            clearInterval(tick);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', stop);
            pressed.clear();
            ik.close();
            setTarget(null);
        };
    }, [isOn]);

    return { isOn, target, toggle, press, release };
}

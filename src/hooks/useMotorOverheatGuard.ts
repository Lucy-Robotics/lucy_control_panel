/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ControllerJointConfig } from '../Constants/rosConfig';
import { subscribeToJointTemperatures } from '../Services/ros/handlers/JointTemperature.handler';
import { publishJointTorque } from '../Services/ros/handlers/JointTorque.handler';
import {
    NO_OVERHEAT,
    acceptOverheat,
    jointsAllowedToContinue,
    nextOverheatState,
    torqueCommands,
} from '../Utils/motorOverheat.utils';
import { useThrottledJointReadings } from './useThrottledJointReadings';

const TEMPERATURE_HZ = 2;

export interface MotorOverheat {
    temperatures: ReadonlyMap<string, number>;
    trippedJoints: ReadonlySet<string>;
    canContinue: boolean;
    continueWithOverheat: () => void;
}

export function useMotorOverheatGuard(
    isConnected: boolean,
    holdsControl: boolean,
    controllers: ControllerJointConfig[] | null,
): MotorOverheat {
    const temperatures = useThrottledJointReadings(subscribeToJointTemperatures, isConnected, TEMPERATURE_HZ);
    const [state, setState] = useState(NO_OVERHEAT);
    const wasCuttingRef = useRef(false);

    useEffect(() => {
        setState((current) => (isConnected ? nextOverheatState(current, temperatures) : NO_OVERHEAT));
    }, [isConnected, temperatures]);

    useEffect(() => {
        if (!holdsControl || !controllers) {
            wasCuttingRef.current = false;
            return;
        }
        const cutting = state.tripped.size > 0;
        if (cutting || wasCuttingRef.current) publishJointTorque(torqueCommands(controllers, state.tripped));
        wasCuttingRef.current = cutting;
    }, [holdsControl, controllers, state.tripped, temperatures]);

    const continueWithOverheat = useCallback(() => {
        setState((current) => acceptOverheat(current, temperatures));
    }, [temperatures]);

    return useMemo(() => ({
        temperatures,
        trippedJoints: state.tripped,
        canContinue: jointsAllowedToContinue(state, temperatures).length > 0,
        continueWithOverheat,
    }), [temperatures, state, continueWithOverheat]);
}

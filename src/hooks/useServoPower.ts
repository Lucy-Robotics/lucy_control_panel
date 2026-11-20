/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useMemo } from 'react';
import { subscribeToJointVoltages } from '../Services/ros/handlers/DynamicJointState.handler';
import { servoPowerOf, type ServoPower } from '../Utils/servoPower.utils';
import { motorValuesByJoint } from '../Utils/motorSpecs';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import { useThrottledJointReadings } from './useThrottledJointReadings';

export function useServoPower(isConnected: boolean): ServoPower {
    const voltages = useThrottledJointReadings(subscribeToJointVoltages, isConnected, 2);
    const { activeHardwareDoc, motorSpecs } = useActiveHardwareRos();
    const minVolts = useMemo(() => motorValuesByJoint(activeHardwareDoc, motorSpecs, 'min_volts'), [activeHardwareDoc, motorSpecs]);
    return useMemo(() => servoPowerOf(voltages, minVolts), [voltages, minVolts]);
}

/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useThrottledReadings } from './useThrottledJointReadings';
import { subscribeToJointInterfaces } from '../Services/ros/handlers/DynamicJointState.handler';

const subscribeToReadings = subscribeToJointInterfaces({
    loads: 'load',
    currents: 'current',
    efforts: 'effort',
    temperatures: 'temperature',
});
const NO_READINGS = { loads: new Map(), currents: new Map(), efforts: new Map(), temperatures: new Map() };

export function useJointReadings(isConnected: boolean) {
    return useThrottledReadings(subscribeToReadings, isConnected, NO_READINGS);
}

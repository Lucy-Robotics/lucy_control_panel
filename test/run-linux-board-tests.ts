/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { controllerJointConfigsFromHardwareYaml } from '../src/Utils/hardwareControllersFromYaml.ts';
import { defaultNewActuatorRow, defaultNewPressureSensorRow } from '../src/features/hardwareConfiguration/model/documentHelpers.ts';

const doc = {
    boards: { linux_so_arm: { internal_servo_slots: 6, controller: { name: 'so_arm_controller' } } },
    actuators: [{ id: 'rotation', urdf_joint: 'Rotation', board: 'linux_so_arm', virtual_pin: 0, physical_pin: 1 }],
};

const [controller] = controllerJointConfigsFromHardwareYaml(doc);
assert.equal(controller.defaultCategory, 'So Arm', 'a linux_ board is named without its host prefix');
assert.equal(defaultNewActuatorRow(doc, 'linux_so_arm')?.id, 'act_so_arm_1', 'a new actuator on a linux_ board drops the host prefix');
assert.equal(defaultNewPressureSensorRow(doc, 'rotation')?.id, 'pressure_so_arm_0', 'a new sensor on a linux_ board drops the host prefix');

console.log('linux board: 3 checks passed');

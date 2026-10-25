/*
 * Lucy Control Panel - production mode (joint-angle sliders) checks.
 */

import assert from 'node:assert/strict';
import { toJointSpace } from '../src/Utils/productionMode.ts';
import { jointRadToServoRad, servoRadToJointRad } from '../src/Utils/actuatorJointMapping.ts';

const DEG = Math.PI / 180;
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-4, `${a} != ${b}`);

// left_pinky on the bench: inverted servo, open (URDF 0) at 170 deg, closed (URDF 1.358) at 0.
const pinkyMapping = { offsetRad: 170 * DEG, direction: -1, scale: 0.45769 };
// left_index: 0..130 deg servo, URDF 0..1.302, not inverted.
const indexMapping = { offsetRad: 0, direction: 1, scale: 0.57384 };
const configs = [{
    topic: '/right_controller/joint_trajectory',
    joints: ['pinky', 'index', 'no_urdf'],
    defaultCategory: 'Right',
    jointLimits: {
        pinky: { minRad: 0, maxRad: 170 * DEG, defaultRad: 170 * DEG, mapping: pinkyMapping },
        index: { minRad: 0, maxRad: 130 * DEG, defaultRad: 0, mapping: indexMapping },
        no_urdf: { minRad: 0, maxRad: Math.PI, defaultRad: Math.PI / 2, mapping: indexMapping },
    },
}];
const urdf = new Map([
    ['pinky', { lowerRad: 0, upperRad: 1.358 }],
    ['index', { lowerRad: 0, upperRad: 1.302 }],
]);

const [joint] = toJointSpace(configs, urdf);
const pinky = joint.jointLimits!.pinky;
// Joint sliders: open at 0 for every finger, inverted or not, and no servo mapping left to apply.
close(pinky.minRad, 0);
close(pinky.maxRad, 1.358);
close(pinky.defaultRad, 0);
assert.deepEqual(pinky.mapping, { offsetRad: 0, direction: 1, scale: 1 });
close(joint.jointLimits!.index.maxRad, 1.302);
// Without URDF limits the servo travel, seen as joint angles, bounds the slider.
close(joint.jointLimits!.no_urdf.maxRad, servoRadToJointRad(Math.PI, indexMapping));

// Switching modes carries a slider value through both mappings: the servo does not move.
const servoBefore = 40 * DEG;
const jointValue = jointRadToServoRad(servoRadToJointRad(servoBefore, pinkyMapping), pinky.mapping);
close(jointRadToServoRad(jointValue, pinkyMapping), servoBefore);

console.log('production mode: all checks passed');

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actualPoseOf, isPoseReached, targetPoseOf } from '../src/Utils/targetPose.ts';
import type { JointControlState } from '../src/Constants/robotTypes.ts';

const SHOULDER = 'left_shoulder_z_link_joint';
const shoulderMapping = () => ({ offsetRad: 1.5708, direction: 1, scale: 1 });
const slider = (currentValue: number): JointControlState => ({
    name: SHOULDER, currentValue, targetValue: currentValue, minValue: 0, maxValue: Math.PI, type: 'revolute', category: 'Left',
});

test('the target pose turns servo slider angles into URDF joint angles', () => {
    assert.ok(Math.abs(targetPoseOf([slider(1.5708)], null, shoulderMapping)[SHOULDER]) < 1e-9);
});

test('a slider being moved sets the target instead of its committed value', () => {
    assert.ok(Math.abs(targetPoseOf([slider(1.5708)], { name: SHOULDER, value: 2.0708 }, shoulderMapping)[SHOULDER] - 0.5) < 1e-9);
});

test('the actual pose uses the same servo to URDF conversion as the target', () => {
    const joint = { ...slider(0), actualValue: 1.5708 };
    assert.ok(Math.abs(actualPoseOf([joint], shoulderMapping)[SHOULDER]) < 1e-9);
});

test('the pose counts as reached only within the tolerance', () => {
    assert.ok(isPoseReached({ [SHOULDER]: 0.5 }, { [SHOULDER]: 0.51 }));
    assert.ok(!isPoseReached({ [SHOULDER]: 0.5 }, { [SHOULDER]: 0.7 }));
});

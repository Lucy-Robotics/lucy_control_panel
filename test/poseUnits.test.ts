import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isJointAnglePose } from '../src/Utils/poseUnits.ts';

const pose = { id: 'p', name: 'rest', timestamp: 0, joints: { left_wrist_z_link_joint: 2.618 } };

test('a pose saved in joint angles can be loaded', () => {
    assert.ok(isJointAnglePose({ ...pose, unit: 'joint' }));
});

test('a pose saved before joint angles, in servo angles, is refused', () => {
    assert.ok(!isJointAnglePose(pose));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { deviceQuaternion, orientationInBase } from '../src/Utils/phoneOrientation.ts';

const axisInBase = (q: number[], axis: THREE.Vector3) =>
    axis.clone().applyQuaternion(new THREE.Quaternion(q[0], q[1], q[2], q[3])).toArray().map((v) => Math.round(v * 1000) / 1000 + 0);

test('the phone at its resting pose is aligned with the robot base', () => {
    const rest = deviceQuaternion(37, 2, -1);
    assert.deepEqual(orientationInBase(rest, rest.clone()).map((v) => Math.round(v * 1000) / 1000 + 0), [0, 0, 0, 1]);
});

test('turning the phone flat on the table turns the trihedron about the base vertical', () => {
    const q = orientationInBase(deviceQuaternion(0, 0, 0), deviceQuaternion(90, 0, 0));
    assert.deepEqual(axisInBase(q, new THREE.Vector3(1, 0, 0)), [0, 1, 0]);
    assert.deepEqual(axisInBase(q, new THREE.Vector3(0, 0, 1)), [0, 0, 1]);
});

test('tilting the phone forward tilts the trihedron about the base x axis', () => {
    const q = orientationInBase(deviceQuaternion(0, 0, 0), deviceQuaternion(0, 90, 0));
    assert.deepEqual(axisInBase(q, new THREE.Vector3(1, 0, 0)), [1, 0, 0]);
    assert.deepEqual(axisInBase(q, new THREE.Vector3(0, 0, 1)), [0, 1, 0]);
});

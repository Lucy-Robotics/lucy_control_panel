import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSimulatedArm } from '../src/features/hardwareConfiguration/calibration/simulatedArm.ts';

test('the simulated adapter marks a mock or Gazebo stack as not real hardware', () => {
    assert.equal(isSimulatedArm({ adapters: [{ port: '/dev/null', serial: 'SIMULATED' }] }), true);
});

test('a real USB adapter is real hardware', () => {
    assert.equal(isSimulatedArm({ adapters: [{ port: '/dev/ttyACM0', serial: '5A68012345' }] }), false);
});

test('no adapter plugged in is not mistaken for the simulated arm', () => {
    assert.equal(isSimulatedArm({ adapters: [] }), false);
});

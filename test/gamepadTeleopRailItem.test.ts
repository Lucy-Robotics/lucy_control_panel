import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gamepadDisabledReason } from '../src/Components/ControlPage/gamepadTeleopRailItem.tsx';

const ready = { isOn: false, onToggle: () => undefined, isConnected: true, isSending: true, hasEndEffector: true, otherTeleop: null };

test('the controller button is usable once a pad is connected and control is on', () => {
    assert.equal(gamepadDisabledReason(ready), undefined);
});

test('the controller button asks for a button press when no pad is seen yet', () => {
    assert.match(gamepadDisabledReason({ ...ready, isConnected: false })!, /press any of its buttons/);
});

test('the controller button says which teleop to turn off first', () => {
    assert.match(gamepadDisabledReason({ ...ready, otherTeleop: 'phone Teleop' })!, /Turn phone Teleop off/);
});

test('a running controller teleop can always be turned off', () => {
    assert.equal(gamepadDisabledReason({ ...ready, isOn: true, isConnected: false, isSending: false }), undefined);
});

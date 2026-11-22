import { test } from 'node:test';
import assert from 'node:assert/strict';
import { switchBlockedReason } from '../src/Utils/robotSwitchRules.ts';

test('the robot can be switched only while nobody controls it', () => {
    assert.equal(switchBlockedReason('none', null), null);
    assert.match(switchBlockedReason('self', null)!, /Turn CONTROL off/);
    assert.match(switchBlockedReason('other', null)!, /Another client/);
});

test('a switch in progress blocks another one, whoever controls', () => {
    assert.equal(switchBlockedReason('none', 'marty_urdf'), 'Switching to Marty…');
    assert.equal(switchBlockedReason('self', 'marty_urdf'), 'Switching to Marty…');
});

/*
 * Lucy Control Panel - Calibration Wizard Model Test Runner
 * Covers the pure wizard logic in calibrationModel.ts: no ROS, no DOM, no vite.
 */

import * as model from '../src/features/hardwareConfiguration/calibration/calibrationModel.ts';
import { createSuite, deepEqual } from './calibrationCheckRunner.ts';

const { check, report } = createSuite();

console.log('================================================================');
console.log('LUCY CONTROL PANEL - CALIBRATION MODEL TEST SUITE');
console.log('================================================================\n');

check('parseStatus parses a valid status payload', deepEqual(
    model.parseStatus('{"phase":"joints","message":"go"}'),
    { ...model.EMPTY_STATUS, phase: 'joints', message: 'go' },
));
check('parseStatus rejects malformed JSON', model.parseStatus('{not json') === null);
check('parseStatus rejects a bare JSON number', model.parseStatus('42') === null);
check('parseStatus rejects the literal null', model.parseStatus('null') === null);

check('wizardStepIndex: mid_pose is step 1', model.wizardStepIndex('mid_pose') === 1);
check('wizardStepIndex: joints is step 2', model.wizardStepIndex('joints') === 2);
check('wizardStepIndex: review is step 3', model.wizardStepIndex('review') === 3);
check('wizardStepIndex: applied is step 4', model.wizardStepIndex('applied') === 4);
check('wizardStepIndex: verify_drive is step 4', model.wizardStepIndex('verify_drive') === 4);
check('wizardStepIndex: idle falls back to step 0', model.wizardStepIndex('idle') === 0);
check('wizardStepIndex: unsupported falls back to step 0', model.wizardStepIndex('unsupported') === 0);

check('requiredHealthOk is false with no checks at all', model.requiredHealthOk([]) === false);
check('requiredHealthOk is true when every required check passes', model.requiredHealthOk([
    { id: 'a', required: true, ok: true, label: 'A' },
    { id: 'b', required: false, ok: false, label: 'B' },
]) === true);
check('requiredHealthOk is false when a required check fails', model.requiredHealthOk([
    { id: 'a', required: true, ok: false, label: 'A' },
]) === false);

const joints: model.CalibrationJoint[] = [
    { name: 'shoulder_pan', min_span: 100, full_turn: false, ticks: 10 },
    { name: 'elbow', min_span: 100, full_turn: false, ticks: 20 },
];
check('nextJoint returns the first unaccepted joint', model.nextJoint({
    ...model.EMPTY_STATUS,
    joints,
    accepted: {},
})?.name === 'shoulder_pan');
check('nextJoint skips joints already accepted', model.nextJoint({
    ...model.EMPTY_STATUS,
    joints,
    accepted: { shoulder_pan: [0, 1] },
})?.name === 'elbow');
check('nextJoint is null once every joint is accepted', model.nextJoint({
    ...model.EMPTY_STATUS,
    joints,
    accepted: { shoulder_pan: [0, 1], elbow: [0, 1] },
}) === null);

const barWithRange = model.rangeBar([1000, 3000], 2000, 1500);
check('rangeBar computes left/width from the recorded range', barWithRange.left > 0 && barWithRange.width > 0);
check('rangeBar marks a wide-enough sweep as enough', barWithRange.enough === true);
check('rangeBar marks a too-narrow sweep as not enough', model.rangeBar([1000, 1100], 1050, 1500).enough === false);
const barNoRange = model.rangeBar(null, null, 100);
check('rangeBar with no range centers on the half-turn tick and has no span', barNoRange.span === 0 && barNoRange.tick === null);
const barClamped = model.rangeBar([0, 4095], 5000, 100);
check('rangeBar stays on the track for an out-of-range tick', barClamped.left === 0 && barClamped.width === 100 && barClamped.tick === 100);

check('demoAngle starts at the midpoint at t=0', Math.abs(model.demoAngle(0, -1, 1) - 0) < 1e-9);
check('demoAngle is periodic', Math.abs(model.demoAngle(0, -1, 1, 4) - model.demoAngle(4, -1, 1, 4)) < 1e-9);

for (const state of model.IDENTITY_NEEDS_WIZARD) {
    check(`bootRoute sends identity state "${state}" to the wizard`, model.bootRoute({
        state,
        adapter_serial: '',
        matched_config: '',
        config_active: false,
        control_allowed: false,
        message: '',
    }) === 'wizard');
}
check('bootRoute sends a matched, inactive config to activate', model.bootRoute({
    state: 'match',
    adapter_serial: 'ABC',
    matched_config: 'default',
    config_active: false,
    control_allowed: true,
    message: '',
}) === 'activate');
check('bootRoute leaves a matched, active config alone', model.bootRoute({
    state: 'match',
    adapter_serial: 'ABC',
    matched_config: 'default',
    config_active: true,
    control_allowed: true,
    message: '',
}) === 'none');

check('readableError passes a plain string through', model.readableError('boom') === 'boom');
check('readableError extracts the message field from a JSON error', model.readableError('{"message":"span_too_small"}') === 'span_too_small');
check('readableError falls back to the raw text when JSON has no message', model.readableError('{"code":"x"}') === '{"code":"x"}');
check('readableError falls back to the raw text on malformed JSON', model.readableError('{not json') === '{not json');

check('errorHint knows span_too_small', model.errorHint('span_too_small').length > 0);
check('errorHint is blank for an unknown code', model.errorHint('something_else') === '');

report();

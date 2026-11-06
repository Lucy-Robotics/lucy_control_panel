import assert from 'node:assert/strict';
import {
    bootRoute,
    demoAngle,
    EMPTY_STATUS,
    nextJoint,
    parseStatus,
    rangeBar,
    readableError,
    requiredHealthOk,
    wizardStepIndex,
    WIZARD_STEPS,
    type HardwareIdentity,
} from '../src/features/hardwareConfiguration/calibration/calibrationModel.ts';
import {
    parseHardwareConfigYaml,
    stringifyHardwareConfigYaml,
} from '../src/Utils/hardwareConfigYaml.ts';

const tests: [string, () => void][] = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

const joint = (name: string) => ({ name, min_span: 100, full_turn: false, ticks: 2047 });
const identity = (state: string, config_active = false): HardwareIdentity => ({
    state,
    adapter_serial: 'A',
    matched_config: '',
    config_active,
    control_allowed: false,
    message: '',
});

test('steps follow the phases in order', () => {
    const order = (['idle', 'mid_pose', 'joints', 'review', 'applied'] as const).map(wizardStepIndex);
    assert.deepEqual(order, [0, 1, 2, 3, 4]);
    assert.equal(order.at(-1), WIZARD_STEPS.length - 1);
    // A session left over from the old Verify step still lands on the last step.
    assert.equal(wizardStepIndex('verify_drive'), 4);
});

test('joints are walked in profile order', () => {
    const status = {
        ...EMPTY_STATUS,
        joints: [joint('Rotation'), joint('Pitch'), joint('Jaw')],
        accepted: { Rotation: [1, 2] as [number, number] },
    };
    assert.equal(nextJoint(status)?.name, 'Pitch');
    assert.equal(nextJoint({ ...status, accepted: {
        Rotation: [1, 2], Pitch: [1, 2], Jaw: [1, 2],
    } }), null);
});

test('only required health checks block', () => {
    const check = (required: boolean, ok: boolean) => ({ id: 'x', label: 'x', required, ok });
    assert.equal(requiredHealthOk([check(true, true), check(false, false)]), true);
    assert.equal(requiredHealthOk([check(true, false)]), false);
    assert.equal(requiredHealthOk([]), false, 'no checks yet is not healthy');
});

test('range bar reports progress against the expected span', () => {
    const none = rangeBar(null, null, 1700);
    assert.equal(none.span, 0);
    assert.equal(none.enough, false);
    assert.equal(none.tick, null);

    const some = rangeBar([1000, 3000], 2047, 1700);
    assert.equal(some.span, 2000);
    assert.equal(some.enough, true);
    assert.ok(some.left > 24 && some.left < 25);
    assert.ok(some.tick !== null && Math.abs(some.tick - some.mid) < 1e-9);
});

test('range bar stays on the track for out of range values', () => {
    const bar = rangeBar([0, 4095], 5000, 100);
    assert.equal(bar.left, 0);
    assert.equal(bar.width, 100);
    assert.equal(bar.tick, 100);
});

test('demo stays inside the joint limits', () => {
    for (let t = 0; t < 8; t += 0.1) {
        const a = demoAngle(t, -1, 2);
        assert.ok(a >= -1 - 1e-9 && a <= 2 + 1e-9);
    }
});

test('boot routing follows the table', () => {
    for (const state of [
        'unreachable', 'no_adapter', 'ambiguous', 'selected_missing', 'open_failed',
        'bus_dead', 'no_serial', 'recovery', 'no_binding', 'offsets_differ',
    ]) {
        assert.equal(bootRoute(identity(state)), 'wizard', state);
    }
    assert.equal(bootRoute(identity('match', true)), 'none');
    assert.equal(bootRoute(identity('match', false)), 'activate');
    assert.equal(bootRoute(identity('simulated', true)), 'none');
    assert.equal(bootRoute(identity('unsupported')), 'none');
});

test('status parsing survives bad input and fills gaps', () => {
    assert.equal(parseStatus('{not json'), null);
    assert.equal(parseStatus('null'), null);
    assert.deepEqual(parseStatus('{"phase":"unsupported"}')?.joints, []);
    assert.equal(parseStatus('{"phase":"unsupported"}')?.phase, 'unsupported');
});

test('pipeline errors read as sentences', () => {
    assert.equal(readableError('{"field": "x", "message": "joint is wrong"}'), 'joint is wrong');
    assert.equal(readableError('plain text'), 'plain text');
    assert.equal(readableError('{broken'), '{broken');
    assert.equal(readableError('{"field": "x"}'), '{"field": "x"}');
});

test('saving a preset from the YAML editor keeps its calibration', () => {
    const doc = parseHardwareConfigYaml(
        "version: 1\ncalibration:\n  adapter_serial: '5970072960'\n  homing_offsets: {rotation: -5}\n",
    );
    const again = parseHardwareConfigYaml(stringifyHardwareConfigYaml(doc));
    assert.deepEqual(again.calibration, {
        adapter_serial: '5970072960',
        homing_offsets: { rotation: -5 },
    });
});

let failed = 0;
for (const [name, fn] of tests) {
    try {
        fn();
        console.log(`ok - ${name}`);
    } catch (e) {
        failed += 1;
        console.error(`FAIL - ${name}\n${e instanceof Error ? e.message : String(e)}`);
    }
}
console.log(`${tests.length - failed}/${tests.length} calibration tests passed`);
process.exit(failed ? 1 : 0);

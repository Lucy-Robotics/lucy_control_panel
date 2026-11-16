import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEW_SESSION, TIP_UP_LOWERS_WRIST_PITCH, gamepadTick, type ArmNow, type Session } from '../src/Utils/gamepadSession.ts';
import { STEP_M } from '../src/Utils/gamepadMotion.ts';
import type { PadInput } from '../src/Utils/gamepadLayout.ts';
import type { Vec3 } from '../src/Utils/phoneMotion.ts';

const END_EFFECTOR: Vec3 = [0, -0.2, 0.2];
const DT = 0.05;
const released: PadInput = {
    enable: false, right: 0, forward: 0, lift: 0, pitch: 0, roll: 0, squeeze: 0, slow: 0,
    nudge: { forward: 0, right: 0 }, open: false, close: false, fine: false,
};
const held = (input: Partial<PadInput> = {}): PadInput => ({ ...released, enable: true, ...input });
const arm = (now: Partial<ArmNow> = {}): ArmNow => ({
    endEffector: END_EFFECTOR, claw: () => 0.6, pitch: () => 0.5, roll: () => 0.4, ...now,
});

function run(inputs: PadInput[], now: ArmNow = arm(), session: Session = NEW_SESSION) {
    return inputs.map((input) => {
        const tick = gamepadTick(session, input, now, DT);
        session = tick.session;
        return tick;
    });
}

test('nothing moves while L1 is released, whatever the sticks do', () => {
    const [tick] = run([{ ...released, forward: 1, lift: 1, pitch: 1, roll: 1, squeeze: 1 }]);
    assert.deepEqual([tick.publish, tick.claw, tick.pitch, tick.roll], [null, null, null, null]);
});

test('pressing L1 keeps the claw where it is instead of jumping', () => {
    const [tick] = run([held()]);
    assert.ok(Math.abs(tick.claw! - 0.6) < 1e-9);
});

test('pressing L1 sends no roll until Square or Circle turns it', () => {
    const ticks = run([held(), held({ roll: 1 })]);
    assert.equal(ticks[0].roll, null);
    assert.ok(ticks[1].roll! > 0.4);
});

test('holding L1 with the left stick forward moves the target', () => {
    const ticks = run([held({ forward: 1 }), held({ forward: 1 })]);
    assert.ok(ticks[1].publish![1] < END_EFFECTOR[1]);
});

test('the right stick up tilts the tip up by turning the wrist pitch motor, without moving the target', () => {
    const [tick] = run([held({ pitch: 1 })]);
    assert.equal(tick.publish, null);
    assert.ok(Math.sign(tick.pitch! - 0.5) === TIP_UP_LOWERS_WRIST_PITCH);
});

test('pressing L1 sends no pitch until the right stick tilts it', () => {
    const [tick] = run([held()]);
    assert.equal(tick.pitch, null);
});

test('an idle pad under L1 publishes nothing new', () => {
    const ticks = run([held(), held()]);
    assert.equal(ticks[1].publish, null);
});

test('one D-pad press moves exactly one step however long it is held', () => {
    const up = held({ nudge: { forward: 1, right: 0 } });
    const ticks = run([held(), up, up, up]);
    assert.ok(Math.abs(ticks[1].publish![1] - (END_EFFECTOR[1] - STEP_M)) < 1e-9);
    assert.equal(ticks[2].publish, null);
    assert.equal(ticks[3].publish, null);
});

test('releasing L1 freezes the claw even when R2 lets go', () => {
    const ticks = run([held({ squeeze: 1 }), { ...released, squeeze: 0 }]);
    assert.equal(ticks[0].claw, 0);
    assert.equal(ticks[1].claw, null);
});

test('an R1 press toggles fine mode and a second press turns it off', () => {
    const click = held({ fine: true });
    const ticks = run([held(), click, click, held(), click]);
    assert.deepEqual(ticks.map((t) => t.session.fine), [false, true, true, true, false]);
});

test('fine mode can be toggled while L1 is released', () => {
    const [tick] = run([{ ...released, fine: true }]);
    assert.equal(tick.session.fine, true);
});

test('pressing L1 again restarts from where the arm and wrist really are', () => {
    const ticks = run([held({ forward: 1, pitch: 1 }), held({ forward: 1 }), released, held()]);
    assert.deepEqual(ticks[3].session.target, END_EFFECTOR);
    assert.equal(ticks[3].session.pitch, 0.5);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEW_SESSION, gamepadTick, type Session } from '../src/Utils/gamepadSession.ts';
import { STEP_M } from '../src/Utils/gamepadMotion.ts';
import type { PadInput } from '../src/Utils/gamepadLayout.ts';
import type { Vec3 } from '../src/Utils/phoneMotion.ts';

const END_EFFECTOR: Vec3 = [0, -0.2, 0.2];
const DT = 0.05;
const released: PadInput = {
    enable: false, swing: 0, reach: 0, lift: 0, squeeze: 0, slow: 0,
    nudge: { forward: 0, right: 0 }, open: false, close: false, fine: false,
};
const held = (input: Partial<PadInput> = {}): PadInput => ({ ...released, enable: true, ...input });
const clawAt = (openness: number) => () => openness;

function run(inputs: PadInput[], claw = clawAt(0.6), session: Session = NEW_SESSION) {
    return inputs.map((input) => {
        const tick = gamepadTick(session, input, END_EFFECTOR, claw, DT);
        session = tick.session;
        return tick;
    });
}

test('nothing moves while L1 is released, whatever the sticks do', () => {
    const [tick] = run([{ ...released, reach: 1, lift: 1, squeeze: 1, nudge: { forward: 1, right: 0 } }]);
    assert.equal(tick.publish, null);
    assert.equal(tick.claw, null);
});

test('pressing L1 keeps the claw where it is instead of jumping', () => {
    const [tick] = run([held()], clawAt(0.6));
    assert.ok(Math.abs(tick.claw! - 0.6) < 1e-9);
});

test('holding L1 with the left stick forward moves the target away from the base', () => {
    const ticks = run([held({ reach: 1 }), held({ reach: 1 })]);
    assert.ok(ticks[1].publish![1] < END_EFFECTOR[1]);
});

test('an idle stick under L1 publishes no new target', () => {
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

test('a touchpad click toggles fine mode and a second click turns it off', () => {
    const click = held({ fine: true });
    const ticks = run([held(), click, click, held(), click]);
    assert.deepEqual(ticks.map((t) => t.session.fine), [false, true, true, true, false]);
});

test('fine mode can be toggled while L1 is released', () => {
    const [tick] = run([{ ...released, fine: true }]);
    assert.equal(tick.session.fine, true);
});

test('pressing L1 again restarts from where the gripper really is', () => {
    const ticks = run([held({ reach: 1 }), held({ reach: 1 }), released, held()]);
    assert.deepEqual(ticks[3].session.target, END_EFFECTOR);
});

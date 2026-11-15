import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRIP_FEEL, STRAIN, rumbleFor } from '../src/Utils/gamepadRumble.ts';

const NONE = new Set<string>();
const loads = (entries: Record<string, number>) => new Map(Object.entries(entries));

test('an idle arm does not rumble', () => {
    assert.deepEqual(rumbleFor(loads({ Jaw: 0.02, Elbow: 0.1 }), 'Jaw', NONE), { weak: 0, strong: 0 });
});

test('gripping something makes the light motor hum harder as the jaw pushes', () => {
    const light = rumbleFor(loads({ Jaw: GRIP_FEEL.from + 0.1 }), 'Jaw', NONE).weak;
    const firm = rumbleFor(loads({ Jaw: -(GRIP_FEEL.from + 0.3) }), 'Jaw', NONE).weak;
    assert.ok(light > 0 && firm > light);
    assert.equal(rumbleFor(loads({ Jaw: GRIP_FEEL.full }), 'Jaw', NONE).weak, 1);
});

test('only a straining arm motor shakes the heavy motor', () => {
    assert.equal(rumbleFor(loads({ Jaw: 0.9 }), 'Jaw', NONE).strong, 0);
    assert.equal(rumbleFor(loads({ Elbow: STRAIN.from }), 'Jaw', NONE).strong, 0);
    assert.equal(rumbleFor(loads({ Elbow: -STRAIN.full }), 'Jaw', NONE).strong, 1);
});

test('an overheated motor shakes the heavy motor at full strength', () => {
    assert.equal(rumbleFor(loads({}), 'Jaw', new Set(['Pitch'])).strong, 1);
});

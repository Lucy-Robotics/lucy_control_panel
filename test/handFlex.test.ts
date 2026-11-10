import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clawOpenness, fingerFlex, thumbFlex, type Point3D } from '../src/Utils/handFlex.ts';

const point = (x: number, y: number, z = 0): Point3D => ({ x, y, z });
const scaled = ({ x, y, z }: Point3D, factor: number) => point(x * factor, y * factor, z * factor);

const STRAIGHT = { wrist: point(0, 0), mcp: point(0, 4), pip: point(0, 7), dip: point(0, 9), tip: point(0, 10) };
const CURLED = { wrist: point(0, 0), mcp: point(0, 4), pip: point(3, 4), dip: point(3, 2), tip: point(2, 2) };

function fingerWithBends(bends: [number, number, number]) {
    const headings = [0, bends[2], bends[2] + bends[1], bends[2] + bends[1] + bends[0]];
    const [mcp, pip, dip, tip] = headings.reduce<Point3D[]>((points, heading) => {
        const from = points.at(-1) ?? point(0, 0);
        return [...points, point(from.x + Math.sin(heading), from.y + Math.cos(heading))];
    }, []);
    return { wrist: point(0, 0), mcp, pip, dip, tip };
}

function hand(thumbTip: Point3D, fingerTip: Point3D): Point3D[] {
    const points = Array.from({ length: 21 }, () => point(0, 0));
    points[9] = point(0, 1);
    points[4] = thumbTip;
    [8, 12, 16, 20].forEach((index) => { points[index] = fingerTip; });
    return points;
}

test('a straight finger has no flex', () => {
    assert.equal(fingerFlex(STRAIGHT), 0);
});

test('a finger bent at right angles is fully flexed', () => {
    assert.equal(fingerFlex(CURLED), 1);
});

test('depth noise on one joint of an open finger stays relaxed', () => {
    assert.equal(fingerFlex(fingerWithBends([0.24, 0.79, 0.61])), 0);
});

test('a curled finger with one joint looking straight stays flexed', () => {
    assert.equal(fingerFlex(fingerWithBends([1.36, 1.4, 0.64])), 1);
});

test('a half curled finger reads between open and closed', () => {
    assert.equal(Math.round(fingerFlex(fingerWithBends([0.8, 0.8, 0.8])) * 10) / 10, 0.5);
});

test('an extended thumb stays relaxed', () => {
    assert.equal(thumbFlex(fingerWithBends([0.18, 0.11, 0.53])), 0);
});

test('a thumb tucked into a fist reads as flexed', () => {
    assert.ok(thumbFlex(fingerWithBends([1.21, 0.41, 0.52])) > 0.8);
});

test('a finger curling towards the camera counts as flexed', () => {
    const towardsCamera = { ...CURLED, pip: point(0, 4, 3), dip: point(0, 2, 3), tip: point(0, 2, 2) };
    assert.equal(fingerFlex(towardsCamera), 1);
});

test('flex does not depend on hand size', () => {
    const half = Object.fromEntries(Object.entries(CURLED).map(([name, p]) => [name, scaled(p, 0.5)]));
    assert.equal(fingerFlex(half as typeof CURLED), fingerFlex(CURLED));
});

test('a repeated landmark does not produce NaN', () => {
    assert.equal(fingerFlex({ ...STRAIGHT, tip: STRAIGHT.dip }), 0);
});

test('thumb touching the fingers closes the claw', () => {
    assert.equal(clawOpenness(hand(point(1, 1), point(1, 1))), 0);
});

test('thumb far from the fingers opens the claw', () => {
    assert.equal(clawOpenness(hand(point(-1, 1), point(1, 1))), 1);
});

test('claw openness does not depend on hand size', () => {
    const large = hand(point(0.2, 1), point(0.8, 1));
    assert.equal(clawOpenness(large.map((p) => scaled(p, 0.1))), clawOpenness(large));
});

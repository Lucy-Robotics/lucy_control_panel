/*
 * Lucy Control Panel - actuator auto-calibration checks (withUrdfCalibration).
 */

import assert from 'node:assert/strict';
import { withUrdfCalibration } from '../src/features/hardwareConfiguration/model/calibration.ts';

const DEG = Math.PI / 180;
const limits = new Map([
    ['thumb', { lowerRad: 0, upperRad: 1.149 }],
    ['jaw', { lowerRad: 0, upperRad: 10 * DEG }],
    ['wrist', { lowerRad: -Math.PI / 2, upperRad: Math.PI / 2 }],
]);
const servo = (row: Record<string, unknown>, joint: number) =>
    joint / (Number(row.direction) * Number(row.scale)) + Number(row.offset);
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-3, `${a} != ${b}`);

// Thumb: URDF 0..1.149 rad onto 0..80 deg, as calibrated by hand on the bench.
const thumb = withUrdfCalibration(
    { urdf_joint: 'thumb', limit_min: 0, limit_max: 80 * DEG, default: 0, direction: 1 }, limits);
assert.equal(thumb.scale, 0.82291);
assert.equal(thumb.offset, 0);

// Jaw: URDF 0..10 deg onto 25..120 deg gives the hand-tuned scale 10/95 and offset 25 deg.
const jaw = withUrdfCalibration(
    { urdf_joint: 'jaw', limit_min: 25 * DEG, limit_max: 120 * DEG, default: 25 * DEG, direction: 1 }, limits);
assert.equal(jaw.scale, 0.10526);
close(Number(jaw.offset), 25 * DEG);

// Wrist: -90..90 deg onto 0..130 deg rests mid-travel; an out-of-travel default moves there.
const wrist = withUrdfCalibration(
    { urdf_joint: 'wrist', limit_min: 0, limit_max: 130 * DEG, default: 150 * DEG, direction: 1 }, limits);
close(servo(wrist, -Math.PI / 2), 0);
close(servo(wrist, Math.PI / 2), 130 * DEG);
close(Number(wrist.default), 65 * DEG);

// Inverted: the URDF lower limit lands on the servo max.
const inv = withUrdfCalibration(
    { urdf_joint: 'thumb', limit_min: 0, limit_max: 80 * DEG, default: 0, direction: -1 }, limits);
close(servo(inv, 0), 80 * DEG);
close(servo(inv, 1.149), 0);

// No URDF range (robot not connected) or an empty travel: left alone.
const unknown = { urdf_joint: 'nope', limit_min: 0, limit_max: 1, scale: 1, offset: 0 };
assert.equal(withUrdfCalibration(unknown, limits), unknown);
const empty = { urdf_joint: 'thumb', limit_min: 1, limit_max: 1, scale: 1, offset: 0 };
assert.equal(withUrdfCalibration(empty, limits), empty);

console.log('calibration: all checks passed');

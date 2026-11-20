import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calibrationTeaser } from '../src/features/hardwareConfiguration/calibration/calibrationTeaser.ts';

test('a supported robot on real hardware keeps the wizard', () => {
    assert.equal(calibrationTeaser('so101_urdf', true, false), null);
});

test('a supported robot without real hardware is told to restart in Real hardware mode', () => {
    assert.deepEqual(calibrationTeaser('so101_urdf', true, true), {
        kind: 'needs-real-hardware',
        message: 'To calibrate your own so101, restart the stack enabling "Real hardware" mode',
    });
});

test('a robot without interactive calibration is told it is coming soon', () => {
    assert.deepEqual(calibrationTeaser('inmoov_urdf', false, false), {
        kind: 'coming-soon',
        message: 'Calibration is coming soon for your inmoov !',
    });
});

test('the urdf suffix of the robot package is dropped from the teaser', () => {
    assert.match(calibrationTeaser('inmoov_i2_urdf', false, false)!.message, /your inmoov_i2 !$/);
});

test('coming soon wins over the hardware mode on an unsupported robot', () => {
    assert.equal(calibrationTeaser('inmoov_i2_urdf', false, true)?.kind, 'coming-soon');
});

test('an unnamed robot package still gets a readable teaser', () => {
    assert.match(calibrationTeaser('', false, false)!.message, /your robot !$/);
});

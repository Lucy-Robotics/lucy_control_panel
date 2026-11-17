/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ledColorOf, ledIndexOf } from '../src/Utils/eyeLeds.utils.ts';

test('led index comes from the trailing _led_<n> of the link name', () => {
    assert.equal(ledIndexOf('eye_left_led_0'), 0);
    assert.equal(ledIndexOf('eye_right_led_11'), 11);
});

test('links without a trailing _led_<n> are not leds', () => {
    assert.equal(ledIndexOf('eye_left'), null);
    assert.equal(ledIndexOf('eye_left_led_3_joint'), null);
    assert.equal(ledIndexOf('led_strip'), null);
});

test('led takes the rgb at its index', () => {
    assert.equal(ledColorOf([0xff0000, 0x00ff00], 1), 0x00ff00);
});

test('black, missing or out-of-range colors turn the led off', () => {
    assert.equal(ledColorOf([0x000000], 0), null);
    assert.equal(ledColorOf([0xff0000], 5), null);
    assert.equal(ledColorOf([], 0), null);
});

test('bits above rgb are ignored', () => {
    assert.equal(ledColorOf([0xff00ff00], 0), 0x00ff00);
});

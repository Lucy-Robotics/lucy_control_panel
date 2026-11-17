/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { attachHoverGlow } from '../src/Utils/hoverGlow.ts';
import { eyeColors, hasEyeLeds, hexToRgb, ledColorOf, ledIndexOf, ledSlotOf, rgbToHex } from '../src/Utils/eyeLeds.utils.ts';

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

test('with twelve colors both eyes share them', () => {
    assert.equal(ledSlotOf('eye_left_led_3', 12), 3);
    assert.equal(ledSlotOf('eye_right_led_3', 12), 3);
});

test('with twenty-four colors the right eye takes the second half', () => {
    assert.equal(ledSlotOf('eye_left_led_3', 24), 3);
    assert.equal(ledSlotOf('eye_right_led_3', 24), 15);
    assert.equal(ledSlotOf('eye_left', 24), null);
});

test('one color per eye fills each eye ring', () => {
    const colors = eyeColors(0xff0000, 0x00ff00);
    assert.equal(colors.length, 24);
    assert.equal(ledColorOf(colors, ledSlotOf('eye_left_led_11', colors.length)!), 0xff0000);
    assert.equal(ledColorOf(colors, ledSlotOf('eye_right_led_0', colors.length)!), 0x00ff00);
});

test('only a robot with eye led links gets the eye colors', () => {
    assert.equal(hasEyeLeds('<robot><link name="eye_left_led_0"/></robot>'), true);
    assert.equal(hasEyeLeds('<robot><link name="eye_left"/></robot>'), false);
    assert.equal(hasEyeLeds(null), false);
});

test('color boxes round-trip through rgb', () => {
    assert.equal(hexToRgb('#ff8000'), 0xff8000);
    assert.equal(rgbToHex(0x00ff00), '#00ff00');
    assert.equal(rgbToHex(hexToRgb('#0a0b0c')), '#0a0b0c');
});

test('an unlit led gets no hover glow, so it stays invisible', () => {
    const robot = Object.assign(new THREE.Group(), { links: {} });
    const eye = new THREE.Mesh(new THREE.BoxGeometry());
    const unlitLed = new THREE.Mesh(new THREE.CircleGeometry());
    unlitLed.visible = false;
    robot.add(eye, unlitLed);
    const scene = new THREE.Scene();
    const glow = attachHoverGlow(scene, robot as never, 'eye', () => 'eye', new THREE.MeshBasicMaterial());
    assert.equal(scene.children.length, 1);
    glow.detach();
});

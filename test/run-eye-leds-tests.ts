/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { attachHoverGlow } from '../src/Utils/hoverGlow.ts';
import { eyeColors, hasEyeLeds, hexToRgb, ledColorOf, ledEyeOf, ledIndexOf, ledSlotOf, rgbToHex } from '../src/Utils/eyeLeds.utils.ts';

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

test('the left eye tries one look per led pair, the right eye has them all but one shared spill light', async () => {
    const { featuresOfLed } = await import('../src/Utils/eyeLedLooks.ts');
    assert.deepEqual([...featuresOfLed('left', 0)], []);
    assert.deepEqual([...featuresOfLed('left', 1)], []);
    assert.deepEqual([...featuresOfLed('left', 2)], ['hotCore']);
    assert.deepEqual([...featuresOfLed('left', 7)], ['spill']);
    assert.deepEqual([...featuresOfLed('left', 11)], ['saturate']);
    assert.deepEqual([...featuresOfLed('right', 5)].sort(), ['fade', 'halo', 'hotCore', 'saturate']);
});

test('bright colors wash toward white, dark ones barely move', async () => {
    const { saturated } = await import('../src/Utils/eyeLedLooks.ts');
    const bright = saturated(0xff0000);
    assert.ok(bright.g > 0.3 && bright.r === 1);
    assert.ok(saturated(0x200000).g < 0.05);
});

test('led links name their eye', () => {
    assert.equal(ledEyeOf('eye_left_led_4'), 'left');
    assert.equal(ledEyeOf('eye_right_led_0'), 'right');
    assert.equal(ledEyeOf('eye_left'), null);
});

test('a halo on an unlit led gets no hover glow either', () => {
    const robot = Object.assign(new THREE.Group(), { links: {} });
    const unlitLed = new THREE.Mesh(new THREE.CircleGeometry());
    unlitLed.visible = false;
    unlitLed.add(new THREE.Mesh(new THREE.CircleGeometry()));
    robot.add(unlitLed);
    const scene = new THREE.Scene();
    const glow = attachHoverGlow(scene, robot as never, 'eye', () => 'eye', new THREE.MeshBasicMaterial());
    assert.equal(scene.children.length, 0);
    glow.detach();
});

test('setting an led up twice, as React dev mode does, still lights it once', async () => {
    const { createLedView } = await import('../src/Utils/eyeLedLooks.ts');
    const link = new THREE.Group();
    const led = new THREE.Mesh(new THREE.CylinderGeometry());
    link.add(led);
    const features = new Set(['halo', 'hotCore', 'spill'] as const);
    createLedView(led, link, features).dispose();
    const view = createLedView(led, link, features);
    view.show(0x00ff00);
    assert.equal(led.visible, true);
    assert.equal(led.children.length, 2, 'one core and one halo, not two of each');
    assert.equal(link.children.filter(child => (child as THREE.PointLight).isPointLight).length, 1);
    view.dispose();
    assert.equal(led.visible, false);
    assert.equal(led.children.length, 0);
});

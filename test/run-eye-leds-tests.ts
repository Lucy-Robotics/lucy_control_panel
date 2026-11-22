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

test('bright colors wash toward white, dark ones barely move', async () => {
    const { whitened } = await import('../src/Utils/eyeLedView.ts');
    const bright = whitened(0xff0000);
    assert.ok(bright.g > 0.3 && bright.r === 1);
    assert.ok(whitened(0x200000).g < 0.05);
});

test('an led disc is solid in the middle and fades out at its rim', async () => {
    const { softEdgeAlpha } = await import('../src/Utils/eyeLedView.ts');
    assert.equal(softEdgeAlpha(0), 1);
    assert.equal(softEdgeAlpha(0.6), 1);
    assert.ok(softEdgeAlpha(0.85) > 0 && softEdgeAlpha(0.85) < 1);
    assert.equal(softEdgeAlpha(1), 0);
});

test('the halo stays off the led disc, so its middle keeps the softened color', async () => {
    const { haloAlpha } = await import('../src/Utils/eyeLedView.ts');
    assert.equal(haloAlpha(0), 0);
    assert.equal(haloAlpha(0.2), 0);
    assert.ok(haloAlpha(0.45) > 0.2);
    assert.equal(haloAlpha(1), 0);
});

test('led and halo are flat discs, with no rim to catch the light', async () => {
    const { createLedView } = await import('../src/Utils/eyeLedView.ts');
    const led = new THREE.Mesh(new THREE.CylinderGeometry());
    createLedView(led);
    const halo = led.children[0] as THREE.Mesh;
    for (const mesh of [led, halo]) assert.equal(mesh.geometry.type, 'CircleGeometry');
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

test('setting an led up twice, as React dev mode does, still lights it with one halo', async () => {
    const { createLedView } = await import('../src/Utils/eyeLedView.ts');
    const led = new THREE.Mesh(new THREE.CylinderGeometry());
    createLedView(led).dispose();
    const view = createLedView(led);
    view.show(0x00ff00);
    assert.equal(led.visible, true);
    assert.equal(led.children.length, 1);
    view.dispose();
    assert.equal(led.visible, false);
    assert.equal(led.children.length, 0);
});

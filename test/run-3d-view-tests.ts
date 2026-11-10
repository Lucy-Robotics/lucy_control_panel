/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

globalThis.window ??= {
    location: { protocol: 'http:', host: 'localhost' },
    addEventListener: () => {},
    removeEventListener: () => {},
} as unknown as Window;
globalThis.localStorage ??= { getItem: () => null, setItem: () => {} } as unknown as Storage;

import assert from 'node:assert/strict';
import ROSLIB from 'roslib';
import * as THREE from 'three';
import { createEffortHeatMap } from '../src/Utils/effortHeatMap.ts';
import { applyStyle } from '../src/Utils/robotMaterialStyle.ts';
import { getMaterialState, originalMaterialOf } from '../src/Utils/robotMaterialState.ts';

{
    const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
    const { subscribeToJointInterfaces } = await import('../src/Services/ros/handlers/DynamicJointState.handler.ts');
    const calls: { op: string }[] = [];
    const fakeRos = new ROSLIB.Ros({});
    fakeRos.callOnConnection = (call: { op: string }) => calls.push(call);
    RosBridgeService.getInstance().ros = fakeRos;
    let readings: Record<string, Map<string, number>> | null = null;
    const unsubscribe = subscribeToJointInterfaces({ loads: 'load', currents: 'current' })((next: typeof readings) => { readings = next; });
    fakeRos.emit('/dynamic_joint_states', {
        joint_names: ['Pitch'],
        interface_values: [{ interface_names: ['load', 'current'], values: [0.3, 1.2] }],
    });
    unsubscribe();
    assert.equal(calls.filter((c) => c.op === 'subscribe').length, 1, 'all joint readings share one subscription');
    assert.deepEqual(readings, { loads: new Map([['Pitch', 0.3]]), currents: new Map([['Pitch', 1.2]]) }, 'each reading is split by interface');
}

const { material, sources } = createEffortHeatMap();
const shader = {
    uniforms: {} as Record<string, { value: unknown }>,
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
};
material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, null as unknown as THREE.WebGLRenderer);
assert.equal(shader.uniforms.heatSources.value, sources, 'the shader reads the live heat sources');
assert.ok(shader.vertexShader.includes('vHeatWorldPosition = '), 'three.js still has the vertex chunk the heat map hooks into');
assert.ok(shader.fragmentShader.includes('heatRamp(heatAtFragment())'), 'three.js still has the fragment chunk the heat map hooks into');

const original = new THREE.MeshStandardMaterial({ color: 0x336699, emissive: 0x111111, emissiveIntensity: 0.5 });
const display = original.clone();
const focus = new THREE.Color(0x00ff00);
applyStyle(display, original, 'selected', false, focus, 0.3);
assert.ok(display.color.equals(focus) && display.emissive.equals(focus), 'a selected part takes the focus colour');
applyStyle(display, original, 'unselected', true, focus, 0.3);
assert.ok(display.transparent && display.opacity === 0.3 && display.wireframe, 'an unselected part fades out');
applyStyle(display, original, 'overheated', false, focus, 0.3);
assert.ok(display.color.equals(new THREE.Color(0xff2020)) && display.emissiveIntensity === 0.6, 'an overheated part glows red');
applyStyle(display, original, 'normal', false, focus, 0.3);
assert.ok(display.color.equals(original.color) && display.emissive.equals(original.emissive), 'a normal part gets its own colours back');
assert.ok(!display.transparent && display.opacity === 1, 'a normal part is opaque again');

const robot = new THREE.Group() as unknown as Parameters<typeof getMaterialState>[0];
const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [display]);
assert.equal(originalMaterialOf(robot, mesh), display, 'an unstyled mesh is its own original');
getMaterialState(robot).originals.set(mesh, original);
assert.equal(originalMaterialOf(robot, mesh), original, 'a styled mesh reports the material it was loaded with');

console.log('3D view tests passed');

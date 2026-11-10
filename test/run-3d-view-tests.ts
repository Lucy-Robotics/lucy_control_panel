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
import { URDFJoint, URDFLink, URDFVisual } from 'urdf-loader/src/URDFClasses.js';
import { createEffortHeatMap } from '../src/Utils/effortHeatMap.ts';
import { applyStyle } from '../src/Utils/robotMaterialStyle.ts';
import { getMaterialState, originalMaterialOf } from '../src/Utils/robotMaterialState.ts';

function jointWithChild(childOffset: THREE.Vector3 | null): { joint: URDFJoint; base: THREE.Group } {
    const base = new THREE.Group();
    const joint = new URDFJoint();
    joint.jointType = 'revolute';
    joint.axis = new THREE.Vector3(0, 0, 1);
    joint.limit.lower = -Math.PI;
    joint.limit.upper = Math.PI;
    joint.position.set(1, 0, 0);
    base.add(joint);
    if (childOffset) {
        const link = new URDFLink();
        const visual = new URDFVisual();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1));
        mesh.position.copy(childOffset);
        visual.add(mesh);
        link.add(visual);
        joint.add(link);
    }
    base.updateMatrixWorld(true);
    return { joint, base };
}

{
    const { jointRingRadius, jointZeroBasis, placeAtJoint } = await import('../src/Utils/jointFrame.utils.ts');

    const { joint } = jointWithChild(new THREE.Vector3(0.5, 0, 0));
    assert.ok(Math.abs(jointRingRadius(joint) - 0.4 * 0.42) < 1e-6, 'the ring scales with the child link size');
    assert.equal(jointRingRadius(jointWithChild(null).joint), 0.11, 'a joint without a child link gets the smallest ring');

    assert.ok(joint.setJointValue(Math.PI / 2), 'the test joint turns');
    joint.updateMatrixWorld(true);
    const gauge = new THREE.Object3D();
    placeAtJoint(gauge, joint, jointZeroBasis(joint));
    const zeroDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(gauge.quaternion);
    const childDirection = new THREE.Box3().setFromObject(joint.children[0]).getCenter(new THREE.Vector3())
        .sub(joint.getWorldPosition(new THREE.Vector3())).normalize();
    assert.ok(gauge.position.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-6, 'the gauge sits on the joint');
    assert.ok(zeroDirection.distanceTo(childDirection) < 1e-6, 'the gauge zero points at the child link');

    const zeroOf = (axis: THREE.Vector3, child?: THREE.Object3D) => {
        const lone = new URDFJoint();
        lone.axis = axis;
        if (child) lone.add(child);
        return new THREE.Vector3(1, 0, 0).applyQuaternion(jointZeroBasis(lone));
    };
    assert.ok(zeroOf(new THREE.Vector3(0, 0, 1)).distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-6, 'a joint without a child link starts its gauge on X');
    assert.ok(zeroOf(new THREE.Vector3(1, 0, 0)).distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6, 'a joint turning around X starts its gauge on Y');
    assert.ok(zeroOf(new THREE.Vector3(0, 0, 1), new THREE.Object3D()).distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-6, 'children that are not links are ignored');

    const orphan = new URDFJoint();
    const untouched = new THREE.Object3D();
    placeAtJoint(untouched, orphan, new THREE.Quaternion());
    assert.equal(untouched.position.lengthSq(), 0, 'a joint outside the robot places nothing');
    const resting = jointWithChild(new THREE.Vector3(0.5, 0, 0)).joint;
    const restingGauge = new THREE.Object3D();
    placeAtJoint(restingGauge, resting, new THREE.Quaternion());
    assert.ok(restingGauge.position.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-6, 'a joint that never moved still places its gauge');

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

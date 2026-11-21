/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { renderScene } from './r3f-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { URDFJoint, URDFLink, URDFRobot } from 'urdf-loader/src/URDFClasses.js';
import { createInvalidateSpy, scene } from './invalidateSpy.ts';
import { JointEffortGauges } from '../src/Components/JointEffortGauges.tsx';
import { RobotFKModel } from '../src/Components/RobotFKModel.tsx';
import { JointRotationGizmo } from '../src/Components/JointRotationGizmo.tsx';
import { CameraViewTween } from '../src/Components/CameraViewTween.tsx';
import { effortHeat } from '../src/Utils/jointEffort.utils.ts';

const FRAME_S = 0.016;

function shoulder() {
    const robot = new URDFRobot();
    const joint = new URDFJoint();
    Object.assign(joint, { name: 'Pitch', urdfName: 'Pitch', jointType: 'revolute', axis: new THREE.Vector3(0, 0, 1) });
    joint.limit.lower = -Math.PI;
    joint.limit.upper = Math.PI;
    const upperArm = Object.assign(new URDFLink(), { name: 'upper_arm', urdfName: 'upper_arm' });
    upperArm.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial()));
    robot.add(joint);
    joint.add(upperArm);
    Object.assign(robot, { joints: { Pitch: joint }, links: { upper_arm: upperArm } });
    robot.updateMatrixWorld(true);
    return { robot, joint };
}

async function framesRequested(view: { advanceFrames: (n: number, delta: number) => Promise<void> }, spy: { calls: number }, frames: number) {
    const before = spy.calls;
    await view.advanceFrames(frames, FRAME_S);
    return spy.calls - before;
}

test('the robot keeps requesting frames while a joint glides to its new angle, then stops at that angle', async () => {
    const { robot, joint } = shoulder();
    const { spy, probe } = createInvalidateSpy();
    const model = (angle: number) => scene(probe, React.createElement(RobotFKModel, { robot, jointAngles: new Map([['Pitch', angle]]), focusColor: '#00ff00' }));
    const view = await renderScene(model(0));
    await view.advanceFrames(3, FRAME_S);
    await view.update(model(1));
    assert.ok(await framesRequested(view, spy, 1) > 0);
    assert.ok(Math.abs(joint.angle as number - 1) > 0.5, 'the joint is still on its way');
    assert.ok(await framesRequested(view, spy, 5) > 0, 'frames keep being requested halfway');
    await view.advanceFrames(300, FRAME_S);
    assert.ok(Math.abs(joint.angle as number - 1) < 1e-3, 'the joint reached the commanded angle');
    assert.equal(await framesRequested(view, spy, 30), 0, 'no frame is requested once settled');
    await view.unmount();
});

test('the camera keeps requesting frames during a view change, then stops on the requested view', async () => {
    const { spy, probe } = createInvalidateSpy();
    const orbit = Object.assign(new THREE.EventDispatcher(), { target: new THREE.Vector3(), update: () => {} });
    const controlsRef = { current: orbit } as never;
    let camera!: THREE.Camera;
    const Camera: React.FC = () => {
        camera = useThree((s) => s.camera);
        React.useMemo(() => camera.position.set(0, 0, 5), []);
        return null;
    };
    const request = { id: 1, direction: new THREE.Vector3(1, 0, 0) };
    const view = await renderScene(scene(probe, React.createElement(Camera), React.createElement(CameraViewTween, { request, controlsRef })));
    assert.ok(await framesRequested(view, spy, 5) > 0, 'frames are requested during the tween');
    assert.ok(await framesRequested(view, spy, 5) > 0, 'still requested halfway');
    await view.advanceFrames(60, FRAME_S);
    assert.ok(camera.position.distanceTo(new THREE.Vector3(5, 0, 0)) < 1e-6, 'the camera ended on the requested view');
    assert.equal(await framesRequested(view, spy, 30), 0, 'no frame is requested after the tween ended');
    await view.unmount();
});

test('the effort arrow keeps requesting frames while its load settles, then stops on the load', async () => {
    const { robot } = shoulder();
    const { spy, probe } = createInvalidateSpy();
    const sources = [new THREE.Vector4()];
    const gauges = (load: number) => scene(probe, React.createElement(JointEffortGauges, { robot, efforts: new Map([['Pitch', load]]), heatSources: sources, showArrows: true }));
    const view = await renderScene(gauges(0.05));
    await view.advanceFrames(100, FRAME_S);
    await view.update(gauges(0.4));
    assert.ok(await framesRequested(view, spy, 1) > 0, 'frames are requested while the load moves');
    assert.ok(Math.abs(sources[0].w - effortHeat(0.4)) > 0.05, 'the arrow is still halfway');
    await view.advanceFrames(300, FRAME_S);
    assert.ok(Math.abs(sources[0].w - effortHeat(0.4)) < 0.02, 'the arrow reached the load');
    assert.equal(await framesRequested(view, spy, 30), 0, 'no frame is requested once the load is steady');
    await view.unmount();
});

test('the joint ring keeps requesting frames while it fades in, then stops fully visible', async () => {
    const { joint } = shoulder();
    const { spy, probe } = createInvalidateSpy();
    const colors = { accent: '#00ff00', active: '#ffffff', warning: '#ffaa00', text: '#ffffff', surface: '#111111', border: '#333333' };
    const gizmo = React.createElement(JointRotationGizmo, { joint, isControlOn: true, controlsRef: { current: null }, colors });
    const view = await renderScene(scene(probe, gizmo));
    const ring = (view.scene.children[0].children[0].instance as THREE.Mesh).material as THREE.Material;
    assert.ok(await framesRequested(view, spy, 2) > 0, 'frames are requested during the fade');
    assert.ok(ring.opacity < 0.55, 'the ring is only partly visible');
    await view.advanceFrames(20, FRAME_S);
    assert.ok(Math.abs(ring.opacity - 0.55) < 1e-6, 'the ring ends fully visible');
    assert.equal(await framesRequested(view, spy, 30), 0, 'no frame is requested after the fade');
    await view.unmount();
});

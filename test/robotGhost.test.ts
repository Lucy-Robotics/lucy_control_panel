/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, renderHook } from './react-harness.ts';
import { renderScene } from './r3f-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as THREE from 'three';
import { URDFJoint, URDFLink, URDFRobot, URDFVisual } from 'urdf-loader/src/URDFClasses.js';
import { showDivergentLinks } from '../src/Utils/ghostLinks.ts';
import { RobotGhost } from '../src/Components/RobotGhost.tsx';
import { useGhostRobot } from '../src/hooks/useGhostRobot.ts';
import { jointStateMessageOf, jointPositionsOf } from '../src/Utils/jointStateMessage.ts';

function part() {
    const node = new URDFVisual();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    node.add(mesh);
    return { node, mesh };
}

function joint(name: string) {
    const j = new URDFJoint();
    Object.assign(j, { name, urdfName: name, jointType: 'revolute', axis: new THREE.Vector3(0, 0, 1) });
    j.limit.lower = -Math.PI;
    j.limit.upper = Math.PI;
    j.position.set(0, 0, 0.2);
    return j;
}

function link(name: string) {
    return Object.assign(new URDFLink(), { name, urdfName: name });
}

function arm() {
    const robot = Object.assign(new URDFRobot(), { name: 'base', urdfName: 'base' });
    const shoulder = joint('Shoulder');
    const upperArm = link('upper_arm');
    const elbow = joint('Elbow');
    const forearm = link('forearm');
    const gauge = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const parts = { base: part(), upperArm: part(), forearm: part() };
    robot.add(parts.base.node, shoulder);
    shoulder.add(upperArm);
    upperArm.add(parts.upperArm.node, elbow, gauge);
    elbow.add(forearm);
    forearm.add(parts.forearm.node);
    const joints = { Shoulder: shoulder, Elbow: elbow };
    const links = { base: robot as URDFLink, upper_arm: upperArm, forearm };
    Object.assign(robot, { joints, links, colliders: {}, visual: {}, frames: { ...joints, ...links } });
    robot.updateMatrixWorld(true);
    return { robot, parts, gauge };
}

const visualOf = (robot: URDFRobot, linkName: string) => robot.links[linkName].children.find((c) => (c as URDFVisual).isURDFVisual)!;

test('only the ghost links away from the real robot are drawn', () => {
    const { robot } = arm();
    const ghost = arm().robot;
    ghost.joints.Elbow.setJointValue(1);
    showDivergentLinks(ghost, robot);
    assert.equal(visualOf(ghost, 'base').visible, false, 'a link where the robot already is stays hidden');
    assert.equal(visualOf(ghost, 'upper_arm').visible, false);
    assert.equal(visualOf(ghost, 'forearm').visible, true, 'the link moved by the target is ghosted');
});

test('a ghost link the robot does not have is always drawn', () => {
    const { robot } = arm();
    const ghost = arm().robot;
    delete (robot.links as Record<string, URDFLink>).forearm;
    showDivergentLinks(ghost, robot);
    assert.equal(visualOf(ghost, 'forearm').visible, true);
});

test('the ghost follows the real robot and takes the target only on the targeted joints', async () => {
    const { robot } = arm();
    const ghost = arm().robot;
    robot.joints.Shoulder.setJointValue(0.4);
    const h = React.createElement;
    const scene = await renderScene(h(RobotGhost, { ghost, robot, pose: { Elbow: 1.2 } }));
    await scene.advanceFrames(1, 0.016);
    assert.equal(ghost.joints.Shoulder.angle, 0.4, 'an untargeted joint sits where the robot is');
    assert.equal(ghost.joints.Elbow.angle, 1.2, 'a targeted joint sits at the target');
    assert.equal(visualOf(ghost, 'forearm').visible, true);
    assert.equal(ghost.parent!.visible, true);

    await scene.update(h(RobotGhost, { ghost, robot, pose: null }));
    robot.joints.Shoulder.setJointValue(-0.4);
    await scene.advanceFrames(1, 0.016);
    assert.equal(ghost.parent!.visible, false, 'with no target there is no ghost');
    assert.equal(ghost.joints.Shoulder.angle, 0.4, 'a hidden ghost is not updated');
    await scene.unmount();
});

test('the ghost is a see-through copy that cannot be clicked and leaves the robot untouched', async () => {
    const { robot, parts } = arm();
    const hook = await renderHook(({ color, opacity }) => useGhostRobot(robot, color, opacity), { color: '#f7f1e5', opacity: 0.15 });
    const ghost = hook.result.current!;
    const meshes: THREE.Mesh[] = [];
    ghost.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });

    assert.notEqual(ghost, robot);
    assert.equal(meshes.length, 3, 'overlays hung on links, like effort gauges, are not copied');
    const material = meshes[0].material as THREE.MeshStandardMaterial;
    assert.ok(meshes.every((m) => m.material === material), 'one shared ghost material');
    assert.ok(material.transparent && material.opacity === 0.15 && !material.depthWrite);
    assert.equal(material.color.getHexString(), 'f7f1e5');
    assert.ok(meshes.every((m) => m.renderOrder === 10 && !m.castShadow));
    const hits: THREE.Intersection[] = [];
    meshes[0].raycast(new THREE.Raycaster(), hits);
    assert.equal(hits.length, 0, 'clicks go through the ghost to the robot');
    assert.ok(parts.base.mesh.material !== material, 'the real robot keeps its own material');

    await hook.rerender({ color: '#00ff41', opacity: 0.5 });
    assert.equal(material.color.getHexString(), '00ff41', 'a new theme colour recolours the ghost');
    assert.equal(material.opacity, 0.5, 'the opacity slider applies live');
    await hook.unmount();
});

test('no robot loaded means no ghost', async () => {
    const hook = await renderHook(() => useGhostRobot(null, '#ffffff', 0.15), {});
    assert.equal(hook.result.current, null);
    await hook.unmount();
});

test('a target pose survives the round trip through a joint state message', () => {
    assert.deepEqual(jointPositionsOf(jointStateMessageOf({ Elbow: 1.2, Shoulder: -0.3 })), { Elbow: 1.2, Shoulder: -0.3 });
    assert.deepEqual(jointStateMessageOf(null), { name: [], position: [] }, 'no target is sent as an empty message');
});

await act(async () => {});

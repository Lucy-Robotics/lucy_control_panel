/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { renderScene } from './r3f-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';
import * as THREE from 'three';
import { URDFJoint, URDFLink, URDFRobot, URDFVisual } from 'urdf-loader/src/URDFClasses.js';

const { JointEffortGauges } = await import('../src/Components/JointEffortGauges.tsx');
const { RobotFKModel } = await import('../src/Components/RobotFKModel.tsx');
const { effortHeat } = await import('../src/Utils/jointEffort.utils.ts');
const { effortColor } = await import('../src/Utils/effortArrow.utils.ts');
const { JointRotationGizmo } = await import('../src/Components/JointRotationGizmo.tsx');

const GREY = 0x555555;

function visual(file: string, color: number) {
    const node = new URDFVisual();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color }));
    node.add(mesh);
    Object.assign(node, { urdfNode: { querySelector: () => ({ getAttribute: () => file }) } });
    return { node, mesh };
}

function so101Shoulder() {
    const robot = new URDFRobot();
    const motor = visual('meshes/sts3215_03a_v1.stl', GREY);
    const joint = new URDFJoint();
    Object.assign(joint, { name: 'Pitch', urdfName: 'Pitch', jointType: 'revolute', axis: new THREE.Vector3(0, 0, 1) });
    joint.limit.lower = -Math.PI;
    joint.limit.upper = Math.PI;
    joint.position.set(1, 2, 3);
    const upperArm = Object.assign(new URDFLink(), { name: 'upper_arm', urdfName: 'upper_arm' });
    const plastic = visual('meshes/upper_arm_so101_v1.stl', 0xffffff);
    robot.add(motor.node, joint);
    joint.add(upperArm);
    upperArm.add(plastic.node);
    Object.assign(robot, { joints: { Pitch: joint }, links: { upper_arm: upperArm } });
    robot.updateMatrixWorld(true);
    return { robot, joint, motorMesh: motor.mesh, plasticMesh: plastic.mesh };
}

{
    const { robot } = so101Shoulder();
    const sources = [new THREE.Vector4(), new THREE.Vector4(9, 9, 9, 1)];
    const scene = await renderScene(React.createElement(JointEffortGauges, { robot, efforts: new Map([['Pitch', 0.2], ['Unknown', 1]]), heatSources: sources }));
    await scene.advanceFrames(1, 0.016);
    assert.deepEqual(sources[0].toArray(), [1, 2, 3, effortHeat(0.2)], 'a joint heats the map at its position with the heat of its load');
    assert.equal(sources[1].w, 0, 'unused heat sources are switched off');
    await scene.unmount();
    assert.equal(sources[0].w, 0, 'closing the view switches every heat source off');
}

{
    const { robot } = so101Shoulder();
    const sources = [new THREE.Vector4()];
    const gauges = (load: number, showArrows: boolean) => React.createElement(JointEffortGauges, { robot, efforts: new Map([['Pitch', load]]), heatSources: sources, showArrows });
    const scene = await renderScene(gauges(0.3, false));
    await scene.advanceFrames(1, 0.016);
    const arrow = scene.scene.children[0].instance as THREE.Group;
    assert.equal(arrow.visible, false, 'arrows stay hidden until they are switched on');
    await scene.update(gauges(0.3, true));
    await scene.advanceFrames(1, 0.016);
    const shaft = arrow.children[0] as THREE.Mesh;
    assert.ok(arrow.visible && arrow.position.distanceTo(new THREE.Vector3(1, 2, 3)) < 1e-6, 'a loaded joint shows its arrow on the joint');
    assert.equal((shaft.material as THREE.MeshBasicMaterial).color.getStyle(), new THREE.Color(effortColor(0.3)).getStyle(), 'the arrow takes the effort colour');
    assert.equal(shaft.scale.y, -1, 'a positive load sweeps the arrow one way');
    await scene.update(gauges(-0.3, true));
    for (let i = 0; i < 30; i++) await scene.advanceFrames(1, 0.05);
    assert.equal(shaft.scale.y, 1, 'a negative load sweeps it the other way');
    await scene.update(gauges(0.01, true));
    for (let i = 0; i < 30; i++) await scene.advanceFrames(1, 0.05);
    assert.equal(arrow.visible, false, 'resting noise shows no arrow');
    await scene.unmount();
}

{
    const { joint } = so101Shoulder();
    const colors = { accent: '#00ff00', active: '#ffffff', warning: '#ffaa00', text: '#ffffff', surface: '#111111', border: '#333333' };
    const scene = await renderScene(React.createElement(JointRotationGizmo, { joint, isControlOn: true, controlsRef: { current: null }, colors }));
    await scene.advanceFrames(1, 0.016);
    const ring = scene.scene.children[0].instance as THREE.Object3D;
    assert.ok(ring.position.distanceTo(joint.getWorldPosition(new THREE.Vector3())) < 1e-6, 'the gizmo sits on its joint');
    await scene.update(React.createElement(JointRotationGizmo, { joint: null, isControlOn: true, controlsRef: { current: null }, colors }));
    assert.equal(scene.scene.children.length, 0, 'no gizmo without a selected joint');
    await scene.unmount();
}

{
    const { robot, motorMesh, plasticMesh } = so101Shoulder();
    const loadedMotor = motorMesh.material as THREE.MeshStandardMaterial;
    const loadedPlastic = plasticMesh.material;
    const heatMaterial = new THREE.MeshStandardMaterial();
    const model = (props: Record<string, unknown>) => React.createElement(RobotFKModel, {
        robot, jointAngles: new Map(), focusColor: '#00ff00', heatMaterial, motorTemperatures: new Map([['Pitch', 60]]), ...props,
    });
    const scene = await renderScene(model({}));
    assert.equal(plasticMesh.material, heatMaterial, 'with the heat map on, structural parts take the heat material');
    const motorMaterial = motorMesh.material as THREE.MeshStandardMaterial;
    assert.ok(motorMaterial !== loadedMotor && motorMaterial.color.r > 0.8 && motorMaterial.color.g < 0.1, 'a motor at 60 °C is drawn red');

    await scene.update(model({ overheatedJointNames: new Set(['Pitch']) }));
    const overheated = motorMesh.material as THREE.MeshStandardMaterial;
    assert.ok(overheated.emissive.r > 0.9 && overheated.emissiveIntensity === 0.6, 'a tripped motor glows red');
    assert.ok((plasticMesh.material as THREE.Material).opacity < 1, 'the rest of the robot fades while a motor is tripped');

    await scene.update(model({ heatMaterial: undefined, selectedPartName: 'upper_arm' }));
    assert.ok((plasticMesh.material as THREE.MeshStandardMaterial).color.equals(new THREE.Color('#00ff00')), 'the selected part takes the focus colour');

    await scene.unmount();
    assert.equal(motorMesh.material, loadedMotor, 'closing the view restores the loaded motor material');
    assert.equal(plasticMesh.material, loadedPlastic, 'closing the view restores the loaded part material');
}

{
    const { robot, joint, motorMesh, plasticMesh } = so101Shoulder();
    const hovers: (string | null)[] = [];
    const model = (props: Record<string, unknown>) => React.createElement(RobotFKModel, {
        robot, jointAngles: new Map(), focusColor: '#00ff00', onPartHover: (name: string | null) => hovers.push(name), ...props,
    });
    const scene = await renderScene(model({}));
    const robotNode = scene.scene.children[0].children[0];
    await scene.fireEvent(robotNode, 'onPointerMove', { intersections: [{ object: plasticMesh }] });
    assert.deepEqual(hovers, ['upper_arm'], 'moving over a part reports it');

    await scene.update(model({ hoveredPartName: 'upper_arm' }));
    await scene.advanceFrames(1, 0.016);
    const shells = scene.scene.instance.children.filter((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh[];
    assert.deepEqual(new Set(shells.map((shell) => shell.geometry)), new Set([plasticMesh.geometry, motorMesh.geometry]), 'the hovered part and the motor driving it glow, outside the robot');
    joint.setJointValue(1);
    await scene.advanceFrames(1, 0.016);
    const plasticShell = shells.find((shell) => shell.geometry === plasticMesh.geometry)!;
    assert.ok(plasticShell.matrix.equals(plasticMesh.matrixWorld), 'the glow follows the part as it moves');
    const glowOpacity = (plasticShell.material as THREE.Material).opacity;

    const gizmoHit = new THREE.Mesh();
    gizmoHit.userData.isGizmoHit = true;
    await scene.fireEvent(robotNode, 'onPointerMove', { intersections: [{ object: gizmoHit }, { object: plasticMesh }] });
    assert.ok((plasticShell.material as THREE.Material).opacity < glowOpacity, 'the glow dims when the gizmo is in front');
    await scene.fireEvent(robotNode, 'onPointerOut', { intersections: [] });
    assert.equal(hovers.at(-1), null, 'leaving the robot clears the hover');

    await scene.update(model({ hoveredPartName: null, selectedPartName: 'upper_arm' }));
    assert.ok((motorMesh.material as THREE.MeshStandardMaterial).color.equals(new THREE.Color('#00ff00')), 'selecting the upper arm highlights the motor that drives it');
    await scene.unmount();
}

console.log('3D scene tests passed');
process.exit(0);

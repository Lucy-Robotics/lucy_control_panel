/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render, renderHook, wait } from './react-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';
import ROSLIB from 'roslib';
import * as THREE from 'three';
import { URDFJoint, URDFLink, URDFRobot, URDFVisual } from 'urdf-loader/src/URDFClasses.js';

const GREY = 0x555555;

function visual(file: string, color: number): { visual: URDFVisual; mesh: THREE.Mesh } {
    const node = new URDFVisual();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color }));
    node.add(mesh);
    Object.assign(node, { urdfNode: { querySelector: () => ({ getAttribute: () => file }) } });
    return { visual: node, mesh };
}

function so101Shoulder() {
    const robot = new URDFRobot();
    const motor = visual('meshes/sts3215_03a_v1.stl', GREY);
    const joint = new URDFJoint();
    Object.assign(joint, { name: 'Pitch', urdfName: 'Pitch', jointType: 'revolute', axis: new THREE.Vector3(0, 0, 1) });
    joint.limit.lower = -Math.PI;
    joint.limit.upper = Math.PI;
    const upperArm = new URDFLink();
    Object.assign(upperArm, { name: 'upper_arm', urdfName: 'upper_arm' });
    const plastic = visual('meshes/upper_arm_so101_v1.stl', 0xffffff);
    plastic.mesh.position.set(0.2, 0, 0);
    robot.add(motor.visual, joint);
    joint.add(upperArm);
    upperArm.add(plastic.visual);
    Object.assign(robot, { joints: { Pitch: joint }, links: { upper_arm: upperArm } });
    robot.updateMatrixWorld(true);
    return { robot, joint, motorMesh: motor.mesh, upperArmMesh: plastic.mesh };
}

{
    const { useMotorTemperatureMaterials } = await import('../src/hooks/useMotorTemperatureMaterials.ts');
    const { JointReadingsLine } = await import('../src/Components/JointReadingsLine.tsx');
    const { MotorOverheatContext } = await import('../src/contexts/MotorOverheatContext.ts');
    const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');

    {
        const { robot, motorMesh } = so101Shoulder();
        const loaded = motorMesh.material as THREE.MeshStandardMaterial;
        const motor = await renderHook(
            ({ temperatures }: { temperatures: Map<string, number> }) => useMotorTemperatureMaterials(robot, temperatures, false),
            { temperatures: new Map([['Pitch', 30]]) },
        );
        const coolMaterial = motor.result.current.get(motorMesh) as THREE.MeshStandardMaterial;
        assert.ok(coolMaterial && coolMaterial !== loaded, 'a motor gets its own temperature material');
        assert.equal(coolMaterial.color.getHex(), GREY, 'a cool motor keeps its own grey');
        await motor.rerender({ temperatures: new Map([['Pitch', 60]]) });
        const hotMaterial = motor.result.current.get(motorMesh) as THREE.MeshStandardMaterial;
        assert.equal(hotMaterial, coolMaterial, 'the motor keeps one material as it heats');
        assert.ok(hotMaterial.color.r > 0.8 && hotMaterial.color.g < 0.1, 'a motor at 60 °C turns red');
        assert.equal(loaded.color.getHex(), GREY, 'the loaded material is never recoloured');
        await motor.unmount();
    }

    {
        const fakeRos = new ROSLIB.Ros({});
        fakeRos.callOnConnection = () => {};
        RosBridgeService.getInstance().ros = fakeRos;
        const overheat = { temperatures: new Map([['Pitch', 45]]), trippedJoints: new Set(), canContinue: false, continueWithOverheat: () => {} };
        const line = await render(React.createElement(
            MotorOverheatContext.Provider,
            { value: overheat },
            React.createElement(JointReadingsLine, { jointName: 'Pitch', isConnected: true }),
        ));
        assert.match(line.container.textContent ?? '', /LOAD:-CURRENT:-EFFORT:-/, 'missing readings show a dash');
        fakeRos.emit('/dynamic_joint_states', {
            joint_names: ['Pitch'],
            interface_values: [{ interface_names: ['load', 'current', 'effort'], values: [0.3, 1.2, 0.45] }],
        });
        await act(() => wait(150));
        assert.equal(line.container.textContent, 'LOAD:0.30CURRENT:1.20 AEFFORT:0.45 N·mTEMP:45 °C', 'a focused joint shows its live readings');
        await line.unmount();
    }

    console.log('3D view React tests passed');
}

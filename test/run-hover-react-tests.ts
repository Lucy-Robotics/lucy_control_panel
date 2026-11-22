/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, renderHook } from './react-harness.ts';
import assert from 'node:assert/strict';
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

function so101BaseAndShoulder() {
    const robot = new URDFRobot();
    const revolute = (name: string, child: URDFLink) => {
        const joint = new URDFJoint();
        Object.assign(joint, { name, urdfName: name, jointType: 'revolute', axis: new THREE.Vector3(0, 0, 1) });
        joint.add(child);
        return joint;
    };
    const link = (name: string) => Object.assign(new URDFLink(), { name, urdfName: name });
    const shoulder = link('shoulder');
    const upperArm = link('upper_arm');
    const rotation = revolute('Rotation', shoulder);
    shoulder.add(revolute('Pitch', upperArm));
    robot.add(rotation);
    Object.assign(robot, { joints: { Rotation: rotation, Pitch: shoulder.children[0] } });
    return { robot, shoulder, upperArm };
}

const meshCount = (root: THREE.Object3D) => {
    let count = 0;
    root.traverse((child) => { if ((child as THREE.Mesh).isMesh) count++; });
    return count;
};

{
    const { attachHoverGlow } = await import('../src/Utils/hoverGlow.ts');
    const { useRobotHover } = await import('../src/hooks/useRobotHover.ts');
    const { robotPartNames } = await import('../src/Utils/robotParts.ts');

    {
        const { robot, shoulder, upperArm } = so101BaseAndShoulder();
        const partNameOf = robotPartNames(robot);
        const rotationMotor = visual('meshes/sts3215_03a_v1.stl', GREY);
        const basePlate = visual('meshes/base_so101_v2.stl', 0xffffff);
        const pitchMotor = visual('meshes/sts3215_03a_v1.stl', GREY);
        const bracket = visual('meshes/rotation_pitch_so101_v1.stl', 0xffffff);
        const upperArmBody = visual('meshes/upper_arm_so101_v1.stl', 0xffffff);
        robot.add(rotationMotor.visual, basePlate.visual);
        shoulder.add(pitchMotor.visual, bracket.visual);
        upperArm.add(upperArmBody.visual);
        assert.equal(partNameOf(rotationMotor.mesh), 'shoulder', 'the base motor belongs to the shoulder it turns, even when meshes load late');
        assert.equal(partNameOf(bracket.mesh), 'shoulder', 'the shoulder bracket is the Rotation part');
        assert.equal(partNameOf(pitchMotor.mesh), 'upper_arm', 'the motor on the shoulder selects the Pitch joint it drives');
        assert.equal(partNameOf(upperArmBody.mesh), 'upper_arm', 'the upper arm is the Pitch part');
        assert.equal(partNameOf(basePlate.mesh), null, 'the fixed base plate is not selectable');

        const scene = new THREE.Scene();
        scene.add(robot);
        const glow = attachHoverGlow(scene, robot, 'shoulder', partNameOf, new THREE.MeshBasicMaterial());
        const glowing = scene.children.slice(1).map((shell) => (shell as THREE.Mesh).geometry);
        assert.deepEqual(new Set(glowing), new Set([rotationMotor.mesh.geometry, bracket.mesh.geometry]), 'hovering the shoulder glows its bracket and the base motor, not the Pitch motor');
        glow.detach();
    }

    {
        const { robot, joint, upperArmMesh } = so101Shoulder();
        const scene = new THREE.Scene();
        scene.add(robot);
        const robotMeshes = meshCount(robot);
        const glow = attachHoverGlow(scene, robot, 'upper_arm', robotPartNames(robot), new THREE.MeshBasicMaterial());
        assert.equal(meshCount(robot), robotMeshes, 'the hover glow never enters the robot tree');
        assert.equal(scene.children.length, 3, 'the hovered part and the motor that drives it each get a glow shell in the scene');
        joint.setJointValue(1);
        glow.follow();
        const shell = scene.children.find((child) => (child as THREE.Mesh).geometry === upperArmMesh.geometry) as THREE.Mesh;
        assert.ok(shell.matrix.equals(upperArmMesh.matrixWorld), 'the glow follows the part as the joint moves');
        glow.detach();
        assert.equal(scene.children.length, 1, 'leaving the part removes its glow');
    }

    {
        const { robot, upperArmMesh } = so101Shoulder();
        const canvas = document.createElement('canvas');
        const hovers: (string | null)[] = [];
        const partNameOf = robotPartNames(robot);
        const onPartHover = (name: string | null) => hovers.push(name);
        const hover = await renderHook(
            ({ clickable }: { clickable: boolean }) => useRobotHover(canvas, robot, partNameOf, onPartHover, clickable),
            { clickable: true },
        );
        const moveOver = (intersections: { object: THREE.Object3D }[]) =>
            act(async () => hover.result.current.handlePointerMove({ intersections } as never));

        await moveOver([{ object: upperArmMesh }]);
        assert.deepEqual(hovers, ['upper_arm'], 'hovering a part reports it');
        assert.equal(canvas.style.cursor, 'pointer', 'a clickable part shows the click cursor');

        await hover.rerender({ clickable: false });
        await moveOver([{ object: upperArmMesh }]);
        assert.equal(canvas.style.cursor, 'auto', 'parts are not clickable without control');

        await act(async () => { canvas.dispatchEvent(new window.Event('pointerdown')); });
        assert.equal(hovers.at(-1), null, 'dragging clears the hover');
        await moveOver([{ object: upperArmMesh }]);
        assert.equal(hovers.at(-1), null, 'no hover while dragging');
        await act(async () => { window.dispatchEvent(new window.Event('pointerup')); });
        await moveOver([{ object: upperArmMesh }]);
        assert.equal(hovers.at(-1), 'upper_arm', 'hover comes back after the drag');

        const gizmo = new THREE.Mesh();
        gizmo.userData.isGizmoHit = true;
        await moveOver([{ object: gizmo }, { object: upperArmMesh }]);
        assert.equal(hover.result.current.gizmoUnderPointer, true, 'a gizmo in front of the part is noticed');

        await act(async () => { window.dispatchEvent(new window.Event('blur')); });
        assert.equal(hovers.at(-1), null, 'leaving the window clears the hover');
        assert.equal(hover.result.current.gizmoUnderPointer, false, 'leaving the window forgets the gizmo');

        await moveOver([{ object: upperArmMesh }]);
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        await act(async () => { document.dispatchEvent(new window.Event('visibilitychange')); });
        assert.equal(hovers.at(-1), null, 'switching to another screen clears the hover');
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        await hover.unmount();
    }

    console.log('hover React tests passed');
}

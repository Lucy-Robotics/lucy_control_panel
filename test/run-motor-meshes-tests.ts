/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import * as THREE from 'three';
import { motorMeshesOf } from '../src/Utils/motorMeshes.ts';

function visual(file: string, name: string | null = null): { group: THREE.Group; mesh: THREE.Mesh } {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh();
    group.add(mesh);
    Object.assign(group, {
        isURDFVisual: true,
        urdfNode: { querySelector: () => ({ getAttribute: () => file }), getAttribute: () => name },
    });
    return { group, mesh };
}

function theMotorInTheParentLinkIsTheJointsMotor() {
    const parentLink = new THREE.Group();
    const joint = new THREE.Group();
    const childLink = new THREE.Group();
    const parentMotor = visual('stl/sts3215_03a_v1.stl');
    const parentPlastic = visual('stl/upper_arm_so101_v1.stl');
    const childMotor = visual('stl/sts3215_03a_no_horn_v1.stl');
    parentLink.add(parentMotor.group, parentPlastic.group, joint);
    joint.add(childLink);
    childLink.add(childMotor.group);

    assert.deepEqual([...motorMeshesOf(joint)], [parentMotor.mesh]);
}

function aJointWithoutAMotorMeshHasNoMotor() {
    const parentLink = new THREE.Group();
    const joint = new THREE.Group();
    parentLink.add(visual('stl/moving_jaw_so101_v1.stl').group, joint);
    assert.equal(motorMeshesOf(joint).size, 0);
}

function aVisualNamedMotorIsTheJointsMotor() {
    const housingLink = new THREE.Group();
    const joint = new THREE.Group();
    const housing = visual('stl/hip.stl', 'motor');
    housingLink.add(housing.group, visual('stl/cover.stl', 'cover').group, joint);
    assert.deepEqual([...motorMeshesOf(joint)], [housing.mesh]);
}

const checks = [theMotorInTheParentLinkIsTheJointsMotor, aJointWithoutAMotorMeshHasNoMotor, aVisualNamedMotorIsTheJointsMotor];

for (const check of checks) check();
console.log(`motor meshes: ${checks.length} checks passed`);

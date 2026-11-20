import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LINK_TOLERANCE_M, linkDiverges } from '../src/Utils/linkDivergence.ts';

const TOLERANCE_RAD = 0.035;
const pose = (x: number, angle = 0) =>
    new THREE.Matrix4().compose(
        new THREE.Vector3(x, 0.2, 0.5),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle),
        new THREE.Vector3(1, 1, 1),
    );

test('a link the robot already covers is not ghosted', () => {
    assert.equal(linkDiverges(pose(0.1), pose(0.1 + LINK_TOLERANCE_M / 2, 0.01), TOLERANCE_RAD), false);
});

test('a link moved or turned away from the robot is ghosted', () => {
    assert.equal(linkDiverges(pose(0.1), pose(0.12), TOLERANCE_RAD), true);
    assert.equal(linkDiverges(pose(0.1), pose(0.1, 0.2), TOLERANCE_RAD), true);
});

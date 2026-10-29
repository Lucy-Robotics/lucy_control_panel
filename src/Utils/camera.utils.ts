/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { getLinkBoundingBox } from './robotModel.utils';

export const CAMERA_FOV = 50;
export const MIN_CAMERA_DISTANCE = 0.2;
export const MAX_CAMERA_DISTANCE = 10;

const DEFAULT_FIT_MARGIN = 1.2;
const POLE_NUDGE = 1e-3;
const ORIGIN = new THREE.Vector3();

export interface Viewport {
    width: number;
    height: number;
}

export interface CameraFraming {
    target: THREE.Vector3;
    position: THREE.Vector3;
    distance: number;
    zoom: number | null;
}

export const zoomForDistance = (distance: number, viewportHeight: number): number =>
    viewportHeight / (2 * distance * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)));

export const distanceForZoom = (zoom: number, viewportHeight: number): number =>
    viewportHeight / (2 * zoom * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)));

export function safeViewDirection(direction: THREE.Vector3): THREE.Vector3 {
    const dir = direction.clone().normalize();
    if (Math.abs(dir.y) > 1 - 1e-6) dir.set(POLE_NUDGE, Math.sign(dir.y), 0).normalize();
    return dir;
}

export function getRobotBoundingBox(robot: URDFRobot): THREE.Box3 {
    robot.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    for (const link of Object.values(robot.links)) box.union(getLinkBoundingBox(link));
    return box;
}

const boxCorners = (box: THREE.Box3): THREE.Vector3[] => {
    const { min, max } = box;
    const corners: THREE.Vector3[] = [];
    for (const x of [min.x, max.x]) {
        for (const y of [min.y, max.y]) {
            for (const z of [min.z, max.z]) corners.push(new THREE.Vector3(x, y, z));
        }
    }
    return corners;
};

export function computeCameraFraming(
    box: THREE.Box3,
    direction: THREE.Vector3,
    camera: THREE.Camera,
    viewport: Viewport,
    margin = DEFAULT_FIT_MARGIN,
): CameraFraming | null {
    if (box.isEmpty() || viewport.width <= 0 || viewport.height <= 0) return null;

    const target = box.getCenter(new THREE.Vector3());
    const back = safeViewDirection(direction);
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    new THREE.Matrix4().lookAt(back, ORIGIN, camera.up).extractBasis(right, up, new THREE.Vector3());

    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : CAMERA_FOV;
    const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const tanH = tanV * (viewport.width / viewport.height);

    let fitDistance = 0;
    let maxDepth = 0;
    let halfWidth = 0;
    let halfHeight = 0;
    for (const corner of boxCorners(box)) {
        const rel = corner.sub(target);
        const x = Math.abs(rel.dot(right)) * margin;
        const y = Math.abs(rel.dot(up)) * margin;
        const depth = rel.dot(back);
        fitDistance = Math.max(fitDistance, depth + x / tanH, depth + y / tanV);
        maxDepth = Math.max(maxDepth, depth);
        halfWidth = Math.max(halfWidth, x);
        halfHeight = Math.max(halfHeight, y);
    }

    let distance: number;
    let zoom: number | null = null;
    if (camera instanceof THREE.OrthographicCamera) {
        const minZoom = zoomForDistance(MAX_CAMERA_DISTANCE, viewport.height);
        const maxZoom = zoomForDistance(MIN_CAMERA_DISTANCE, viewport.height);
        const fitZoom = Math.min(viewport.width / (2 * halfWidth), viewport.height / (2 * halfHeight));
        zoom = THREE.MathUtils.clamp(fitZoom, minZoom, maxZoom);
        distance = distanceForZoom(zoom, viewport.height);
    } else {
        const near = camera instanceof THREE.PerspectiveCamera ? camera.near : 0;
        distance = THREE.MathUtils.clamp(
            Math.max(fitDistance, maxDepth + near),
            MIN_CAMERA_DISTANCE,
            MAX_CAMERA_DISTANCE,
        );
    }

    const position = target.clone().addScaledVector(back, distance);
    return { target, position, distance, zoom };
}

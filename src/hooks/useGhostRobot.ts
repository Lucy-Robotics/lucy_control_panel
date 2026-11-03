/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { isURDFJoint, isURDFLink, isURDFVisual } from '../Utils/robotModel.utils';

const GHOST_OPACITY = 0.3;
const noRaycast = () => {};

function isOverlay(obj: THREE.Object3D): boolean {
    return obj.parent !== null && isURDFLink(obj.parent) && !isURDFJoint(obj) && !isURDFVisual(obj);
}

export function useGhostRobot(robot: URDFRobot | null, color: string): URDFRobot | null {
    const material = useMemo(() => new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: GHOST_OPACITY,
        depthWrite: false,
        emissiveIntensity: 0.6,
        side: THREE.DoubleSide,
    }), []);

    useEffect(() => () => material.dispose(), [material]);

    useEffect(() => {
        material.color.set(color);
        material.emissive.set(color);
    }, [material, color]);

    return useMemo(() => {
        if (!robot) return null;
        const ghost = robot.clone();
        const overlays: THREE.Object3D[] = [];
        ghost.traverse(obj => {
            if (isOverlay(obj)) overlays.push(obj);
        });
        overlays.forEach(obj => obj.removeFromParent());
        ghost.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.material = material;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = 10;
            mesh.raycast = noRaycast;
        });
        return ghost;
    }, [robot, material]);
}

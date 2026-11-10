/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import type { PartNameOf } from '../Utils/robotParts';
import { attachHoverGlow, type HoverGlow } from '../Utils/hoverGlow';

const GLOW_OPACITY = 0.15;
const GLOW_BEHIND_GIZMO_OPACITY = 0.05;

export function useHoverGlow(
    robot: URDFRobot,
    hoveredPartName: string | null,
    partNameOf: PartNameOf,
    color: string,
    behindGizmo: boolean,
): void {
    const scene = useThree((state) => state.scene);
    const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
    const glowRef = useRef<HoverGlow | null>(null);
    const opacity = behindGizmo ? GLOW_BEHIND_GIZMO_OPACITY : GLOW_OPACITY;
    const opacityRef = useRef(opacity);
    opacityRef.current = opacity;

    useEffect(() => {
        if (materialRef.current) materialRef.current.opacity = opacity;
    }, [opacity]);

    useEffect(() => {
        if (!hoveredPartName) return;
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: opacityRef.current,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
        });
        materialRef.current = material;
        const glow = attachHoverGlow(scene, robot, hoveredPartName, partNameOf, material);
        glowRef.current = glow;
        return () => {
            glow.detach();
            glowRef.current = null;
            material.dispose();
            materialRef.current = null;
        };
    }, [scene, robot, hoveredPartName, partNameOf, color]);

    useFrame(() => glowRef.current?.follow());
}

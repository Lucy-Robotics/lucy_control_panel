/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { createGhostOutline, drawGhostOutline } from '../Utils/ghostOutline';

export const GHOST_OUTLINE_RENDER_PRIORITY = 1;

export const GhostOutline: React.FC<{ ghost: THREE.Object3D; color: THREE.ColorRepresentation }> = ({ ghost, color }) => {
    const { gl, scene, camera, size, viewport } = useThree();
    const outline = useMemo(() => createGhostOutline(scene, camera, ghost, color), [scene, camera, ghost, color]);

    useEffect(() => () => outline.dispose(), [outline]);
    useEffect(() => {
        outline.setSize(size.width * viewport.dpr, size.height * viewport.dpr);
    }, [outline, size.width, size.height, viewport.dpr]);

    useFrame(() => {
        gl.autoClear = true;
        gl.render(scene, camera);
        drawGhostOutline(gl, outline);
    }, GHOST_OUTLINE_RENDER_PRIORITY);
    return null;
};

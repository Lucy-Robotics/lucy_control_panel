/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';
import { findParentLink } from '../Utils/robotModel.utils';

export function useRobotHover(
    canvas: HTMLElement,
    robot: URDFRobot,
    partNameOf: (object: THREE.Object3D) => string | null,
    onPartHover?: (partName: string | null) => void,
    clickable = true,
) {
    const lastHoverRef = useRef<string | null>(null);
    const draggingRef = useRef(false);
    const [gizmoUnderPointer, setGizmoUnderPointer] = useState(false);

    useEffect(() => {
        const startDrag = () => {
            draggingRef.current = true;
            canvas.style.cursor = 'auto';
            if (lastHoverRef.current !== null) {
                lastHoverRef.current = null;
                onPartHover?.(null);
            }
        };
        const endDrag = () => { draggingRef.current = false; };
        const leavePage = () => {
            endDrag();
            setGizmoUnderPointer(false);
            if (lastHoverRef.current === null) return;
            lastHoverRef.current = null;
            onPartHover?.(null);
        };
        const leaveIfHidden = () => { if (document.hidden) leavePage(); };
        canvas.addEventListener('pointerdown', startDrag);
        window.addEventListener('pointerup', endDrag, true);
        window.addEventListener('pointercancel', endDrag, true);
        window.addEventListener('blur', leavePage);
        document.addEventListener('visibilitychange', leaveIfHidden);
        return () => {
            canvas.removeEventListener('pointerdown', startDrag);
            window.removeEventListener('pointerup', endDrag, true);
            window.removeEventListener('pointercancel', endDrag, true);
            window.removeEventListener('blur', leavePage);
            document.removeEventListener('visibilitychange', leaveIfHidden);
        };
    }, [canvas, onPartHover]);

    const reportHover = (name: string | null) => {
        canvas.style.cursor = name && clickable ? 'pointer' : 'auto';
        if (lastHoverRef.current === name) return;
        lastHoverRef.current = name;
        onPartHover?.(name);
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (draggingRef.current) return;
        setGizmoUnderPointer(e.intersections.some(i => i.object.userData?.isGizmoHit));
        const hit = e.intersections.find(i => findParentLink(i.object, robot));
        reportHover(hit ? partNameOf(hit.object) : null);
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        if (e.intersections.some(i => findParentLink(i.object, robot))) return;
        setGizmoUnderPointer(false);
        reportHover(null);
    };

    return { handlePointerMove, handlePointerOut, gizmoUnderPointer };
}

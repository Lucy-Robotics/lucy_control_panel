/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { EyeLedsHandler } from '../Services/ros/handlers/EyeLeds.handler';
import { createEyeSpill, createLedView, featuresOfLed, isEyeLedOverlay, type LedView } from '../Utils/eyeLedLooks';
import { ledColorOf, ledEyeOf, ledIndexOf, ledSlotOf } from '../Utils/eyeLeds.utils';

interface Led {
    name: string;
    eye: 'left' | 'right';
    view: LedView;
}

function collectLeds(robot: URDFRobot): Led[] {
    const leds: Led[] = [];
    for (const [name, link] of Object.entries(robot.links)) {
        const eye = ledEyeOf(name);
        const index = ledIndexOf(name);
        if (eye === null || index === null) continue;
        link.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh && !isEyeLedOverlay(mesh)) leds.push({ name, eye, view: createLedView(mesh, link, featuresOfLed(eye, index)) });
        });
    }
    return leds;
}

export function useEyeLeds(robot: URDFRobot | null) {
    useEffect(() => {
        if (!robot) return;
        const leds = collectLeds(robot);
        if (leds.length === 0) return;
        const rightEye = robot.links.eye_right;
        const rightSpill = rightEye ? createEyeSpill(rightEye) : null;
        const unsubscribe = EyeLedsHandler.getInstance().subscribe(colors => {
            const rightLit: number[] = [];
            for (const led of leds) {
                const slot = ledSlotOf(led.name, colors.length);
                const rgb = slot === null ? null : ledColorOf(colors, slot);
                led.view.show(rgb);
                if (led.eye === 'right' && rgb !== null) rightLit.push(rgb);
            }
            rightSpill?.update(rightLit);
        });
        return () => {
            unsubscribe();
            leds.forEach(led => led.view.dispose());
            rightSpill?.dispose();
        };
    }, [robot]);
}

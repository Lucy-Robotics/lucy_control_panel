/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { EyeLedsHandler } from '../Services/ros/handlers/EyeLeds.handler';
import { createLedView, isEyeLedHalo, type LedView } from '../Utils/eyeLedView';
import { ledColorOf, ledIndexOf, ledSlotOf } from '../Utils/eyeLeds.utils';

interface Led {
    name: string;
    view: LedView;
}

function collectLeds(robot: URDFRobot): Led[] {
    const leds: Led[] = [];
    for (const [name, link] of Object.entries(robot.links)) {
        if (ledIndexOf(name) === null) continue;
        link.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh && !isEyeLedHalo(mesh)) leds.push({ name, view: createLedView(mesh) });
        });
    }
    return leds;
}

export function useEyeLeds(robot: URDFRobot | null) {
    useEffect(() => {
        if (!robot) return;
        const leds = collectLeds(robot);
        if (leds.length === 0) return;
        const unsubscribe = EyeLedsHandler.getInstance().subscribe(colors => {
            for (const led of leds) {
                const slot = ledSlotOf(led.name, colors.length);
                led.view.show(slot === null ? null : ledColorOf(colors, slot));
            }
        });
        return () => {
            unsubscribe();
            leds.forEach(led => led.view.dispose());
        };
    }, [robot]);
}

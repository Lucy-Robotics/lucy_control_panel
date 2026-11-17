/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { EyeLedsHandler } from '../Services/ros/handlers/EyeLeds.handler';
import { eyeLedGlowMaterial } from '../Utils/eyeLedGlow';
import { ledColorOf, ledSlotOf } from '../Utils/eyeLeds.utils';

interface Led {
    name: string;
    mesh: THREE.Mesh;
    material: THREE.MeshBasicMaterial;
}

function collectLeds(robot: URDFRobot): Led[] {
    const leds: Led[] = [];
    for (const [name, link] of Object.entries(robot.links)) {
        if (ledSlotOf(name, 0) === null) continue;
        link.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            const material = eyeLedGlowMaterial();
            mesh.material = material;
            mesh.userData.eyeLed = true;
            mesh.visible = false;
            leds.push({ name, mesh, material });
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
                const rgb = slot === null ? null : ledColorOf(colors, slot);
                led.mesh.visible = rgb !== null;
                if (rgb !== null) led.material.color.setHex(rgb);
            }
        });
        return () => {
            unsubscribe();
            leds.forEach(led => { led.mesh.visible = false; });
        };
    }, [robot]);
}

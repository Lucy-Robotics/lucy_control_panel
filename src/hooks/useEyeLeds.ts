/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { EyeLedsHandler } from '../Services/ros/handlers/EyeLeds.handler';
import { ledColorOf, ledIndexOf } from '../Utils/eyeLeds.utils';

interface Led {
    index: number;
    material: THREE.MeshPhongMaterial | THREE.MeshStandardMaterial;
    offColor: THREE.Color;
    offEmissive: THREE.Color;
}

function collectLeds(robot: URDFRobot): Led[] {
    const leds: Led[] = [];
    for (const [name, link] of Object.entries(robot.links)) {
        const index = ledIndexOf(name);
        if (index === null) continue;
        link.traverse(child => {
            const material = (child as THREE.Mesh).material;
            if (material instanceof THREE.MeshPhongMaterial || material instanceof THREE.MeshStandardMaterial) {
                leds.push({ index, material, offColor: material.color.clone(), offEmissive: material.emissive.clone() });
            }
        });
    }
    return leds;
}

function paint(led: Led, rgb: number | null) {
    if (rgb === null) {
        led.material.color.copy(led.offColor);
        led.material.emissive.copy(led.offEmissive);
    } else {
        led.material.color.setHex(rgb);
        led.material.emissive.setHex(rgb);
    }
}

export function useEyeLeds(robot: URDFRobot | null) {
    useEffect(() => {
        if (!robot) return;
        const leds = collectLeds(robot);
        if (leds.length === 0) return;
        const unsubscribe = EyeLedsHandler.getInstance().subscribe(colors => {
            leds.forEach(led => paint(led, ledColorOf(colors, led.index)));
        });
        return () => {
            unsubscribe();
            leds.forEach(led => paint(led, null));
        };
    }, [robot]);
}

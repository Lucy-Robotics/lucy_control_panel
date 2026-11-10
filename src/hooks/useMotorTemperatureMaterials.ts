/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { motorMeshesOf } from '../Utils/motorMeshes';
import { motorHeat, motorTemperatureRgb, type Rgb } from '../Utils/motorTemperatureColor';
import { originalMaterialOf } from '../Utils/robotMaterialState';

const HOT_GLOW = 0.5;
const NO_MOTORS: ReadonlyMap<THREE.Object3D, THREE.Material> = new Map();

type ColoredMaterial = THREE.Material & { color: THREE.Color; emissive?: THREE.Color; wireframe?: boolean };

interface MotorMaterial {
    material: ColoredMaterial;
    cool: Rgb;
}

export function useMotorTemperatureMaterials(
    robot: URDFRobot,
    temperatures: ReadonlyMap<string, number> | undefined,
    wireframe: boolean,
): ReadonlyMap<THREE.Object3D, THREE.Material> {
    const materialsRef = useRef<Map<string, MotorMaterial>>(new Map());
    const jointsKey = temperatures ? [...temperatures.keys()].sort().join(',') : '';

    useEffect(() => () => {
        materialsRef.current.forEach(({ material }) => material.dispose());
        materialsRef.current.clear();
    }, []);

    const byMesh = useMemo(() => {
        if (!jointsKey) return NO_MOTORS;
        const meshes = new Map<THREE.Object3D, THREE.Material>();
        for (const name of jointsKey.split(',')) {
            const joint = robot.joints[name];
            const motorMeshes = joint ? [...motorMeshesOf(joint)] as THREE.Mesh[] : [];
            if (motorMeshes.length === 0) continue;
            let motor = materialsRef.current.get(name);
            if (!motor) {
                const material = originalMaterialOf(robot, motorMeshes[0]).clone() as ColoredMaterial;
                motor = { material, cool: material.color.toArray() as Rgb };
                materialsRef.current.set(name, motor);
            }
            motor.material.wireframe = wireframe;
            const { material } = motor;
            motorMeshes.forEach((mesh) => meshes.set(mesh, material));
        }
        return meshes;
    }, [robot, jointsKey, wireframe]);

    useEffect(() => {
        temperatures?.forEach((celsius, name) => {
            const motor = materialsRef.current.get(name);
            if (!motor) return;
            motor.material.color.setRGB(...motorTemperatureRgb(celsius, motor.cool));
            motor.material.emissive?.copy(motor.material.color).multiplyScalar(HOT_GLOW * motorHeat(celsius));
        });
    }, [temperatures, byMesh]);

    return byMesh;
}

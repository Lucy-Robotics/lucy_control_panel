/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

type Axis = 0 | 1 | 2;
type Sign = 1 | -1;
type Range = [number, number];

const AXES: Axis[] = [0, 1, 2];
const SIGNS: Sign[] = [1, -1];
const SURFACE_OFFSET = 1.002;

const othersOf = (axis: Axis) => AXES.filter(a => a !== axis) as [Axis, Axis];
const span = (a: number, b: number): Range => [Math.min(a, b), Math.max(a, b)];

function pushQuad(positions: number[], axis: Axis, sign: Sign, ranges: Record<number, Range>) {
    const [u, w] = othersOf(axis);
    const at = (pu: number, pw: number) => {
        const p = [0, 0, 0];
        p[axis] = sign * SURFACE_OFFSET;
        p[u] = pu;
        p[w] = pw;
        return p;
    };
    const [u0, u1] = ranges[u];
    const [w0, w1] = ranges[w];
    const quad = [at(u0, w0), at(u1, w0), at(u1, w1), at(u0, w1)];
    const outward = (u + 1) % 3 === w ? sign : -sign;
    const ordered = outward > 0 ? quad : [...quad].reverse();
    for (const i of [0, 1, 2, 0, 2, 3]) positions.push(...ordered[i]);
}

function geometryOf(positions: number[]): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
}

export function buildHoverPatches(chamfer: number): Map<string, THREE.BufferGeometry> {
    const inner = 1 - chamfer;
    const middle: Range = [-inner, inner];
    const rim = (sign: Sign) => span(sign * inner, sign);
    const patches = new Map<string, THREE.BufferGeometry>();

    for (const i of AXES) {
        for (const s of SIGNS) {
            const positions: number[] = [];
            const [j, k] = othersOf(i);
            pushQuad(positions, i, s, { [j]: middle, [k]: middle });
            patches.set(`face-${i}${s}`, geometryOf(positions));
        }
    }

    for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as [Axis, Axis][]) {
        const k = AXES.find(a => a !== i && a !== j)!;
        for (const si of SIGNS) {
            for (const sj of SIGNS) {
                const positions: number[] = [];
                pushQuad(positions, i, si, { [j]: rim(sj), [k]: middle });
                pushQuad(positions, j, sj, { [i]: rim(si), [k]: middle });
                patches.set(`edge-${i}${si}-${j}${sj}`, geometryOf(positions));
            }
        }
    }

    for (const sx of SIGNS) {
        for (const sy of SIGNS) {
            for (const sz of SIGNS) {
                const signs: Record<Axis, Sign> = { 0: sx, 1: sy, 2: sz };
                const positions: number[] = [];
                for (const a of AXES) {
                    const [b, c] = othersOf(a);
                    pushQuad(positions, a, signs[a], { [b]: rim(signs[b]), [c]: rim(signs[c]) });
                }
                patches.set(`corner-${sx}${sy}${sz}`, geometryOf(positions));
            }
        }
    }

    return patches;
}

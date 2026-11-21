/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as THREE from 'three';

export type Triangle = number[][];

export const tempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'lucy-mesh-'));

export function boxTriangles(w = 20, h = 10, d = 30): Triangle[] {
    const corner = [50, -40, 25];
    const p = [[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0], [0, 0, d], [w, 0, d], [w, h, d], [0, h, d]]
        .map((v) => v.map((x, i) => x + corner[i]));
    const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
    return quads.flatMap(([a, b, c, e]) => [[p[a], p[b], p[c]], [p[a], p[c], p[e]]]);
}

export function gridTriangles(n: number, size = 100): Triangle[] {
    const s = size / n;
    const out: Triangle[] = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const [x, y] = [i * s, j * s];
        out.push([[x, y, 0], [x + s, y, 0], [x + s, y + s, 0]], [[x, y, 0], [x + s, y + s, 0], [x, y + s, 0]]);
    }
    return out;
}

export function faceNormal([a, b, c]: Triangle): THREE.Vector3 {
    const [va, vb, vc] = [a, b, c].map((v) => new THREE.Vector3(...v));
    return vc.sub(vb).cross(va.sub(vb)).normalize();
}

export function binaryStl(triangles: Triangle[]): Buffer {
    const buffer = Buffer.alloc(84 + triangles.length * 50);
    buffer.writeUInt32LE(triangles.length, 80);
    triangles.forEach((tri, i) => {
        const values = [...faceNormal(tri).toArray(), ...tri.flat()];
        values.forEach((v, k) => buffer.writeFloatLE(v, 84 + i * 50 + k * 4));
    });
    return buffer;
}

export function objText(triangles: Triangle[], mtl = 'part.mtl'): string {
    const v = triangles.flatMap((t) => t.map((p) => `v ${p.join(' ')}`));
    const vn = triangles.flatMap((t) => t.map(() => `vn ${faceNormal(t).toArray().join(' ')}`));
    const f = triangles.map((_, i) => `f ${[1, 2, 3].map((k) => `${i * 3 + k}//${i * 3 + k}`).join(' ')}`);
    return [`mtllib ${mtl}`, ...v, ...vn, 'usemtl red', ...f].join('\n');
}

export const MTL = 'newmtl red\nKd 1 0 0\nKs 0.5 0.5 0.5\nNs 80\n';

export function daeText(triangles: Triangle[]): string {
    const pos = triangles.flatMap((t) => t.flat()).join(' ');
    const nor = triangles.flatMap((t) => t.flatMap(() => faceNormal(t).toArray())).join(' ');
    const n = triangles.length * 3;
    const source = (id: string, data: string) => `<source id="${id}"><float_array id="${id}-a" count="${n * 3}">${data}</float_array><technique_common><accessor source="#${id}-a" count="${n}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>`;
    return `<?xml version="1.0"?><COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><up_axis>Z_UP</up_axis></asset>
<library_effects><effect id="fx"><profile_COMMON><technique sid="t"><phong><diffuse><color>0 1 0 1</color></diffuse><specular><color>0.5 0.5 0.5 1</color></specular><shininess><float>40</float></shininess></phong></technique></profile_COMMON></effect></library_effects>
<library_materials><material id="mat"><instance_effect url="#fx"/></material></library_materials>
<library_geometries><geometry id="g"><mesh>${source('pos', pos)}${source('nor', nor)}<vertices id="vtx"><input semantic="POSITION" source="#pos"/></vertices><triangles material="m" count="${triangles.length}"><input semantic="VERTEX" source="#vtx" offset="0"/><input semantic="NORMAL" source="#nor" offset="0"/><p>${Array.from({ length: n }, (_, i) => i).join(' ')}</p></triangles></mesh></geometry></library_geometries>
<library_visual_scenes><visual_scene id="s"><node id="n"><instance_geometry url="#g"><bind_material><technique_common><instance_material symbol="m" target="#mat"/></technique_common></bind_material></instance_geometry></node></visual_scene></library_visual_scenes><scene><instance_visual_scene url="#s"/></scene></COLLADA>`;
}

export async function writeFixtures(dir: string, triangles = boxTriangles()) {
    const files = { dae: path.join(dir, 'part.dae'), stl: path.join(dir, 'part.stl'), obj: path.join(dir, 'part.obj') };
    await fs.writeFile(files.dae, daeText(triangles));
    await fs.writeFile(files.stl, binaryStl(triangles));
    await fs.writeFile(files.obj, objText(triangles));
    await fs.writeFile(path.join(dir, 'part.mtl'), MTL);
    return files;
}

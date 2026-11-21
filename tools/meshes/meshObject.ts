/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { ColladaLoader, MTLLoader, OBJLoader, STLLoader } from 'three-stdlib';

const MTLLIB = /^[^\S\r\n]*mtllib[^\S\r\n]+(.+?)[^\S\r\n]*$/gm;
const TEXTURE_RECORDS = /^[^\S\r\n]*(?:map_\w+|bump|disp|decal|refl)[^\S\r\n].*$/gm;
const LINE_AND_POINT_RECORDS = /^[^\S\r\n]*(?:l|lod|p)(?:[^\S\r\n].*)?$/gm;
const STL_COLOR = 0xb0b0b0;

async function readMaterialLibrary(file: string): Promise<string> {
    try {
        return await fs.readFile(file, 'utf8');
    } catch (e) {
        console.warn(`[meshes] ${file}: ${e instanceof Error ? e.message : e}`);
        return '';
    }
}

async function objWithMaterials(file: string): Promise<THREE.Object3D> {
    const obj = await fs.readFile(file, 'utf8');
    const libs = [...obj.matchAll(MTLLIB)].flatMap((match) => match[1].split(/\s+/));
    const mtls = await Promise.all(libs.map((lib) => readMaterialLibrary(path.join(path.dirname(file), lib))));
    const mtl = mtls.join('\n').replace(TEXTURE_RECORDS, '');
    const loader = new OBJLoader();
    if (mtl.trim()) loader.setMaterials(new MTLLoader().parse(mtl, ''));
    const group = loader.parse(obj.replace(LINE_AND_POINT_RECORDS, ''));
    if (!group.children.some((child) => child instanceof THREE.Mesh)) throw new Error(`no faces in ${file}`);
    return !mtl.trim() && group.children.length === 1 ? group.children[0] : group;
}

async function stlMesh(file: string): Promise<THREE.Mesh> {
    const bytes = await fs.readFile(file);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return new THREE.Mesh(new STLLoader().parse(buffer), new THREE.MeshPhongMaterial({ color: STL_COLOR }));
}

export async function meshObject(file: string): Promise<THREE.Object3D> {
    const extension = path.extname(file).toLowerCase();
    if (extension === '.dae') return new ColladaLoader().parse(await fs.readFile(file, 'utf8'), '').scene;
    if (extension === '.stl') return stlMesh(file);
    if (extension === '.obj') return objWithMaterials(file);
    throw new Error(`unsupported mesh type: ${file}`);
}

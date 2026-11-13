/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { meshObject } from './meshObject.ts';

class BlobReader {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;

    readAsArrayBuffer(blob: Blob): void {
        void blob.arrayBuffer().then((buffer) => {
            this.result = buffer;
            this.onloadend?.();
        });
    }
}

async function provideDomForLoaders(): Promise<void> {
    if (globalThis.DOMParser) return;
    const { JSDOM } = await import('jsdom');
    Object.assign(globalThis, { DOMParser: new JSDOM('').window.DOMParser, FileReader: BlobReader });
}

function keepThreeMaterials(object: THREE.Object3D): void {
    object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
            material.userData = { three: material.toJSON() };
        }
    });
}

export async function meshToGlb(file: string): Promise<ArrayBuffer> {
    await provideDomForLoaders();
    const object = await meshObject(file);
    keepThreeMaterials(object);
    return new GLTFExporter().parseAsync(object, { binary: true }) as Promise<ArrayBuffer>;
}

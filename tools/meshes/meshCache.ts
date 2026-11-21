/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { MeshQuality } from '../../src/Constants/meshQuality.ts';

export const MESH_CACHE_DIR = path.join(os.homedir(), '.cache', 'lucy', 'meshes');
export const GLB_FORMAT = '2';

const formatFile = (cacheDir: string) => path.join(cacheDir, 'format');

export async function cacheHasCurrentFormat(cacheDir = MESH_CACHE_DIR): Promise<boolean> {
    try {
        return (await fs.readFile(formatFile(cacheDir), 'utf8')).trim() === GLB_FORMAT;
    } catch {
        return false;
    }
}

export async function markCacheFormat(cacheDir = MESH_CACHE_DIR): Promise<void> {
    await writeAtomically(formatFile(cacheDir), new TextEncoder().encode(GLB_FORMAT));
}

export function cachedGlbPath(source: string, quality: MeshQuality, cacheDir = MESH_CACHE_DIR): string {
    const key = createHash('sha1').update(source).digest('hex').slice(0, 20);
    return path.join(cacheDir, `${key}.${quality}.glb`);
}

export async function isFresh(source: string, glb: string): Promise<boolean> {
    try {
        const [src, out] = await Promise.all([fs.stat(source), fs.stat(glb)]);
        return out.mtimeMs >= src.mtimeMs;
    } catch {
        return false;
    }
}

export async function writeAtomically(file: string, data: Uint8Array): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(temp, data);
    await fs.rename(temp, file);
}

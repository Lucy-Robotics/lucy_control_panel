/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { MESH_QUALITIES } from '../src/Constants/meshQuality.ts';
import { cacheHasCurrentFormat, cachedGlbPath, isFresh, markCacheFormat, writeAtomically } from './meshes/meshCache.ts';
import { meshToGlbs } from './meshes/meshToGlb.ts';

const MESH_FILE = /\.(dae|stl|obj)$/i;
const SKIPPED_DIRS = new Set(['.git', 'node_modules', 'archive']);

async function meshFiles(dir: string): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) found.push(...await meshFiles(full));
        else if (entry.isFile() && MESH_FILE.test(entry.name)) found.push(await fs.realpath(full));
    }
    return found;
}

async function isConverted(source: string): Promise<boolean> {
    const fresh = await Promise.all(MESH_QUALITIES.map((q) => isFresh(source, cachedGlbPath(source, q))));
    return fresh.every(Boolean);
}

const currentFormat = await cacheHasCurrentFormat();
const counts = { converted: 0, fresh: 0, failed: 0 };
const started = Date.now();
for (const dir of process.argv.slice(2)) {
    for (const source of await meshFiles(dir)) {
        if (currentFormat && await isConverted(source)) {
            counts.fresh++;
            continue;
        }
        try {
            for (const [quality, glb] of await meshToGlbs(source)) await writeAtomically(cachedGlbPath(source, quality), glb);
            counts.converted++;
        } catch (e) {
            counts.failed++;
            console.warn(`[meshes] ${source}: ${e instanceof Error ? e.message : e}`);
        }
    }
}
if (!currentFormat) await markCacheFormat();
console.log(`[meshes] ${counts.converted} converted, ${counts.fresh} already up to date, ${counts.failed} failed in ${((Date.now() - started) / 1000).toFixed(0)}s`);

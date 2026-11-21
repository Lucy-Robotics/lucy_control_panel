/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { meshToGlbs } from './meshes/meshToGlb.ts';

const MESH_FILE = /\.(dae|stl|obj)$/i;
const SKIPPED_DIRS = new Set(['.git', 'node_modules', 'archive']);

async function meshFiles(dir: string): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) found.push(...await meshFiles(full));
        else if (entry.isFile() && MESH_FILE.test(entry.name)) found.push(full);
    }
    return found;
}

const counts = { converted: 0, failed: 0 };
const started = Date.now();
for (const dir of process.argv.slice(2)) {
    for (const source of await meshFiles(dir)) {
        try {
            for (const [quality, glb] of await meshToGlbs(source)) await fs.writeFile(`${source}.${quality}.glb`, glb);
            counts.converted++;
        } catch (e) {
            counts.failed++;
            console.warn(`[meshes] ${source}: ${e instanceof Error ? e.message : e}`);
        }
    }
}
console.log(`[meshes] ${counts.converted} converted, ${counts.failed} failed in ${((Date.now() - started) / 1000).toFixed(0)}s`);

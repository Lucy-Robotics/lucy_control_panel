/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const EXTENSIONS = ['.ts', '.tsx', '.js', '/index.ts', '/index.js'];

export async function resolve(specifier, context, next) {
    try {
        return await next(specifier, context);
    } catch (error) {
        for (const extension of EXTENSIONS) {
            try {
                return await next(specifier + extension, context);
            } catch {
                // try the next extension
            }
        }
        throw error;
    }
}

const SOURCE = new URL('../src/', import.meta.url).href;

const ASSET = /\.(md|png|jpe?g|gif|svg|webp|ico|glb|stl|dae|urdf|wasm|task)$/;

export async function load(url, context, next) {
    const [file, query = ''] = url.split('?');
    if (file.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    if (query === 'raw') {
        const text = await readFile(fileURLToPath(file), 'utf8');
        return { format: 'module', source: `export default ${JSON.stringify(text)};`, shortCircuit: true };
    }
    if (ASSET.test(file) || query === 'url') {
        return { format: 'module', source: `export default ${JSON.stringify(file)};`, shortCircuit: true };
    }
    if (!url.startsWith(SOURCE) || !/\.tsx?$/.test(url)) return next(url, context);
    const path = fileURLToPath(url);
    const { code } = await transform(await readFile(path, 'utf8'), {
        loader: url.endsWith('.tsx') ? 'tsx' : 'ts',
        define: { 'import.meta.env': '{}' },
        format: 'esm',
        jsx: 'automatic',
        sourcemap: 'inline',
        sourcefile: path,
    });
    return { format: 'module', source: code, shortCircuit: true };
}

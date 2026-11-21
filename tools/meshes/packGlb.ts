/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { pack } from 'gltfpack';

const SIMPLIFY_ARGS = (error: number) => ['-si', '0', '-se', String(error), '-slb'];

export async function packGlb(glb: Uint8Array, simplifyError: number): Promise<Uint8Array> {
    let packed: Uint8Array | null = null;
    await pack(
        ['-i', 'in.glb', '-o', 'out.glb', '-cc', '-ke', '-km', ...(simplifyError > 0 ? SIMPLIFY_ARGS(simplifyError) : [])],
        {
            read: () => glb,
            write: (_path, data) => { packed = data.slice(); },
        },
    );
    if (!packed) throw new Error('gltfpack wrote no output');
    return packed;
}

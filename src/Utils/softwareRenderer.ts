/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function isSoftwareRenderer(renderer: string | null): boolean {
    return renderer !== null && SOFTWARE_RENDERERS.test(renderer);
}

export function webglRenderer(): string | null {
    try {
        const gl = document.createElement('canvas').getContext('webgl');
        const info = gl?.getExtension('WEBGL_debug_renderer_info');
        return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : null;
    } catch {
        return null;
    }
}

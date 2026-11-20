/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const PROBE_TIMEOUT_MS = 2000;

export function rosBridgeHttpUrl(url: string): string {
    return url.replace(/^ws/i, 'http');
}

export async function rosBridgeReachable(url: string, origin = window.location.origin): Promise<boolean> {
    const httpUrl = rosBridgeHttpUrl(url);
    const sameOrigin = new URL(httpUrl).origin === origin;
    try {
        const response = await fetch(httpUrl, {
            cache: 'no-store',
            mode: sameOrigin ? 'same-origin' : 'no-cors',
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        return response.type === 'opaque' || response.status < 500;
    } catch {
        return false;
    }
}

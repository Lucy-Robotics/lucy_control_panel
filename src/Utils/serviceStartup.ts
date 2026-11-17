/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const SERVICE_MISSING = /^Service \S+ does not exist/;

export const SERVICE_STARTUP_WAIT_MS = 10_000;
export const SERVICE_STARTUP_STEP_MS = 500;

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function callOnceServiceIsUp<T>(
    call: () => Promise<T>,
    sleep: (ms: number) => Promise<void> = pause,
): Promise<T> {
    for (let waited = 0; ; waited += SERVICE_STARTUP_STEP_MS) {
        try {
            return await call();
        } catch (error) {
            const missing = error instanceof Error && SERVICE_MISSING.test(error.message);
            if (!missing || waited >= SERVICE_STARTUP_WAIT_MS) throw error;
            await sleep(SERVICE_STARTUP_STEP_MS);
        }
    }
}

/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function createSuite() {
    let passCount = 0;
    let failCount = 0;

    function check(label: string, condition: boolean): void {
        if (condition) {
            console.log(`✓ [PASS] ${label}`);
            passCount++;
        } else {
            console.error(`✗ [FAIL] ${label}`);
            failCount++;
        }
    }

    function report(): void {
        console.log('\n================================================================');
        console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed (${passCount + failCount} total)`);
        console.log('================================================================\n');
        if (failCount > 0) {
            process.exit(1);
        }
    }

    return { check, report };
}

export function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export async function expectRejection(promise: Promise<unknown>, messageContains: string): Promise<boolean> {
    try {
        await promise;
        return false;
    } catch (e) {
        return e instanceof Error && e.message.includes(messageContains);
    }
}

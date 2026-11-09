/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const CONTROL_REQUEST_TIMEOUT_MS = 10_000;

type SubscribeToController = (onController: (controllerId: string) => void) => () => void;

export function awaitControl(
    subscribe: SubscribeToController,
    clientId: string,
    onSettled: (granted: boolean) => void,
    timeoutMs = CONTROL_REQUEST_TIMEOUT_MS,
): () => void {
    let unsubscribe = () => {};
    const timer = setTimeout(() => settle(false), timeoutMs);
    const cancel = () => {
        clearTimeout(timer);
        unsubscribe();
    };
    const settle = (granted: boolean) => {
        cancel();
        onSettled(granted);
    };
    unsubscribe = subscribe((controllerId) => {
        if (controllerId === clientId) settle(true);
    });
    return cancel;
}

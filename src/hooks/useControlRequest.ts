/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { ControlModeHandler } from '../Services/ros/handlers/ControlMode.handler';
import { awaitControl, CONTROL_REQUEST_TIMEOUT_MS } from '../Utils/awaitControl';

const TIMEOUT_MESSAGE = `Can't reach the core: Robot is still OFF after ${CONTROL_REQUEST_TIMEOUT_MS / 1000} s. Check the connection and try again.`;

export function useControlRequest() {
    const [isPending, setIsPending] = useState(false);
    const cancelRef = useRef<() => void>(() => {});

    const cancel = useCallback(() => {
        cancelRef.current();
        setIsPending(false);
    }, []);

    const start = useCallback(() => {
        cancelRef.current();
        const handler = ControlModeHandler.getInstance();
        cancelRef.current = awaitControl(
            (cb) => handler.onControllerChanged(cb),
            handler.clientId,
            (granted) => {
                setIsPending(false);
                if (!granted) message.error(TIMEOUT_MESSAGE);
            },
        );
        setIsPending(true);
    }, []);

    useEffect(() => () => cancelRef.current(), []);

    return { isPending, start, cancel };
}

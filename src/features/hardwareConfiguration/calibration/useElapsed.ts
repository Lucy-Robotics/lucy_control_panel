/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';

export function useElapsed(running: boolean, milliseconds: number): boolean {
    const [elapsed, setElapsed] = useState(false);
    useEffect(() => {
        if (!running) {
            setElapsed(false);
            return;
        }
        const timer = setTimeout(() => setElapsed(true), milliseconds);
        return () => clearTimeout(timer);
    }, [running, milliseconds]);
    return elapsed;
}

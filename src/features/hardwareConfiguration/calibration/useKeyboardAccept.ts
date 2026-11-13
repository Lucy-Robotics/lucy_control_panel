/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef } from 'react';

const isTypingTarget = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement
    && (target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)
        || target.getAttribute('role') === 'slider');

/**
 * Run `action` on Enter or Space while `enabled`. A focused control keeps its own keys, so a
 * focused button is clicked once by the browser rather than twice.
 */
export function useKeyboardAccept(enabled: boolean, action: () => void): void {
    const actionRef = useRef(action);
    actionRef.current = action;

    useEffect(() => {
        if (!enabled) return undefined;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
            e.preventDefault();
            actionRef.current();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [enabled]);
}

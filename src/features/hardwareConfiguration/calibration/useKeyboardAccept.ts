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
 * A button clicked with the mouse keeps the focus in most browsers, so the next Enter would
 * click it again (Start over, typically) instead of accepting. Drop that focus; a button reached
 * with Tab, or clicked from the keyboard (`detail` 0), keeps it.
 */
const releasePointerFocus = (e: MouseEvent) => {
    if (e.detail === 0 || !(e.target instanceof Element)) return;
    const button = e.target.closest('button');
    if (button && button === document.activeElement) button.blur();
};

/**
 * Run `action` on Enter or Space while `enabled`. A focused control keeps its own keys, so a
 * focused button is clicked once by the browser rather than twice.
 */
export function useKeyboardAccept(enabled: boolean, action: () => void): void {
    const actionRef = useRef(action);
    actionRef.current = action;

    useEffect(() => {
        window.addEventListener('click', releasePointerFocus);
        return () => window.removeEventListener('click', releasePointerFocus);
    }, []);

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

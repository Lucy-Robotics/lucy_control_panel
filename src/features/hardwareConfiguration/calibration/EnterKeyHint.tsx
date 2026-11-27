/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';

/**
 * A small Enter keycap, chamfered like Lucy's buttons, telling that the button it sits in also
 * answers to the Enter key. It draws in the text colour, so it follows the button's state.
 */
export const EnterKeyHint: React.FC = () => (
    <span
        data-testid="enter-key-hint"
        aria-label="Shortcut: Enter"
        role="img"
        style={{ display: 'inline-flex', marginLeft: 8, verticalAlign: 'middle', lineHeight: 0 }}
    >
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
            <path
                d="M0.75 0.75H17.25L21.25 4.75V15.25H4.75L0.75 11.25Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="miter"
            />
            <path
                d="M15 4.5V9H7M9.5 6.5L7 9L9.5 11.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
            />
        </svg>
    </span>
);

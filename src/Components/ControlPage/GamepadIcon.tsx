/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

const GamepadSvg = () => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M6 11h4M8 9v4" />
        <path d="M15 12h.01M18 10h.01" />
        <path d="M17.3 5H6.7a4 4 0 0 0-3.96 3.43l-.7 4.95A2.8 2.8 0 0 0 6.9 15.6L9 13.5h6l2.1 2.1a2.8 2.8 0 0 0 4.86-2.22l-.7-4.95A4 4 0 0 0 17.3 5z" />
    </svg>
);

export const GamepadOutlined = (props: Partial<GetProps<typeof Icon>>) => (
    <Icon component={GamepadSvg} {...props} />
);

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
        <path d="M7 6h10a4 4 0 0 1 3.94 3.3l1 5.7a3 3 0 0 1-5.1 2.6L15 16H9l-1.84 1.6A3 3 0 0 1 2.06 15l1-5.7A4 4 0 0 1 7 6z" />
        <path d="M8 9.5v3" />
        <path d="M6.5 11h3" />
        <path d="M15 12h.01" />
        <path d="M17.5 10h.01" />
    </svg>
);

export const GamepadOutlined = (props: Partial<GetProps<typeof Icon>>) => (
    <Icon component={GamepadSvg} {...props} />
);

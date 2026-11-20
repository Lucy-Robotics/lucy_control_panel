/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

const JoystickSvg = () => (
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
        <circle cx="12" cy="5.5" r="3" />
        <path d="M12 8.5v8" />
        <path d="M5 16.5h14a2 2 0 0 1 2 2v1.5H3v-1.5a2 2 0 0 1 2-2z" />
        <path d="M17 13.5h.01" />
    </svg>
);

export const JoystickOutlined = (props: Partial<GetProps<typeof Icon>>) => (
    <Icon component={JoystickSvg} {...props} />
);

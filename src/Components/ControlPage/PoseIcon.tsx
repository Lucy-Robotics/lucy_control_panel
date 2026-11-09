/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

/** A figure holding a pose: one arm raised, the other held out, legs apart. */
const PoseSvg = () => (
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
        <circle cx="12" cy="4.5" r="2" />
        <path d="M12 7.5v6" />
        <path d="M12 9.5 7.5 5" />
        <path d="M12 9.5l5 1.5" />
        <path d="M12 13.5 8.5 20.5" />
        <path d="M12 13.5l3.5 7" />
    </svg>
);

export const PoseOutlined = (props: Partial<GetProps<typeof Icon>>) => (
    <Icon component={PoseSvg} {...props} />
);

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
        <circle cx="12" cy="4" r="2.4" />
        <path d="M12 7.4v7.1" />
        {/* Raised arm, bent at the elbow so the hand stays clear of the shoulder and head */}
        <path d="M12 9.5 7 8.2 4.8 3.2" />
        <path d="M12 9.5l8.2 1.8" />
        <path d="M12 14.5 7.5 22" />
        <path d="M12 14.5l4.5 7.5" />
    </svg>
);

export const PoseOutlined = (props: Partial<GetProps<typeof Icon>>) => (
    <Icon component={PoseSvg} {...props} />
);

/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

const ShuffleSvg = () => (
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
        <path d="M3 7h3.5c1.6 0 3 .8 3.9 2.1l3.2 5.8c.9 1.3 2.3 2.1 3.9 2.1H21" />
        <path d="M3 17h3.5c1.6 0 3-.8 3.9-2.1l.4-.7" />
        <path d="M13.2 9.8l.4-.7C14.5 7.8 15.9 7 17.5 7H21" />
        <path d="M18 4l3 3-3 3" />
        <path d="M18 14l3 3-3 3" />
    </svg>
);

/** "Random" icon (antd ships no shuffle glyph). */
export const ShuffleOutlined = (props: Partial<GetProps<typeof Icon>>) => (
    <Icon component={ShuffleSvg} {...props} />
);

export default ShuffleOutlined;

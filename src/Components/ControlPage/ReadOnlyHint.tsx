/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Tag, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

interface ReadOnlyHintProps {
    /** Why the wrapped control is inert. Omit while it is usable: children then render untouched. */
    reason?: string | undefined;
    /** Wrap in a block-level span, for controls that stretch (sliders). */
    block?: boolean;
    children: React.ReactNode;
}

/**
 * Hover explanation for a control that is intentionally inert.
 *
 * A disabled antd control never fires pointer events, so the tooltip has to
 * hang on a wrapper element instead of on the control itself.
 */
export const ReadOnlyHint: React.FC<ReadOnlyHintProps> = ({
    reason,
    block = false,
    children,
}) => {
    if (!reason) {
        return <>{children}</>;
    }

    return (
        <Tooltip title={reason}>
            <span
                style={{
                    display: block ? 'block' : 'inline-flex',
                    width: block ? '100%' : undefined,
                    cursor: 'help',
                }}
            >
                {children}
            </span>
        </Tooltip>
    );
};

interface ReadOnlyTagProps {
    /** Why the surrounding panel is inert. Omit while it is usable: the tag then renders nothing. */
    reason?: string | undefined;
}

export const ReadOnlyTag: React.FC<ReadOnlyTagProps> = ({ reason }) => {
    if (!reason) {
        return null;
    }

    return (
        <Tooltip title={reason}>
            <Tag
                icon={<EyeOutlined />}
                color="warning"
                style={{ margin: 0, cursor: 'help' }}
            >
                READ-ONLY
            </Tag>
        </Tooltip>
    );
};

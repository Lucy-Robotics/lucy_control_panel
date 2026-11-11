/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Segmented } from 'antd';
import { GHOST_STYLES, setGhostStyle, useGhostStyle, type GhostStyle } from '../hooks/useGhostStyle';

export const GhostStyleSelector: React.FC<{ enabled: boolean }> = ({ enabled }) => (
    <Segmented<GhostStyle>
        size="small"
        block
        value={useGhostStyle()}
        onChange={setGhostStyle}
        disabled={!enabled}
        aria-label="Ghost style"
        options={GHOST_STYLES.map((style) => ({ value: style, label: style.toUpperCase() }))}
        style={{ fontFamily: 'monospace', fontSize: 10 }}
    />
);

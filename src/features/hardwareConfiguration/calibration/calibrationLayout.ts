/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type React from 'react';

/** The step's content; scrolls on its own so the footer stays at the bottom of the page. */
export const stepBody: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto' };

export const twoColumns: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: 16,
    height: '100%',
};

export const textColumn: React.CSSProperties = { minHeight: 0, overflowY: 'auto' };

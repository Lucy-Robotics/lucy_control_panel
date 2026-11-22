/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Stands in for @ant-design/icons for static-rendering tests; see antdStub.tsx for why.
 */
import React from 'react';

function makeIcon(name: string): React.FC<React.HTMLAttributes<HTMLSpanElement>> {
    return (props) => <span data-icon={name} {...props} />;
}

export const CheckCircleFilled = makeIcon('check-circle-filled');
export const CloseCircleFilled = makeIcon('close-circle-filled');
export const WarningFilled = makeIcon('warning-filled');
export const ThunderboltOutlined = makeIcon('thunderbolt-outlined');

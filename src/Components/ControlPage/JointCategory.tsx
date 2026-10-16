/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback } from 'react';
import { Card, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { JointControlState } from '../../Constants/robotTypes.ts';
import { JointControl } from './JointControl.tsx';
import { CustomTitle } from '../CustomTitle.tsx';
import { CONTROL_OFF_HINT, ReadOnlyHint, ReadOnlyTag } from './ReadOnlyHint.tsx';
import {
    SECONDARY_COLOR,
    TEXT_PRIMARY,
} from '../../Constants/theme.ts';

interface JointCategoryProps {
    category: string;
    joints: JointControlState[];
    onJointValueChange: (name: string, value: number) => void;
    onResetCategory: (category: string) => void;
    onResetJoint?: (name: string) => void;
    showDegrees: boolean;
    disabled?: boolean;
}

export const JointCategory: React.FC<JointCategoryProps> = React.memo(({
    category,
    joints,
    onJointValueChange,
    onResetCategory,
    onResetJoint,
    showDegrees,
    disabled = false,
}) => {
    const handleResetCategory = useCallback(() => {
        onResetCategory(category);
    }, [onResetCategory, category]);

    const readOnlyReason = disabled ? CONTROL_OFF_HINT : undefined;

    if (joints.length === 0) {
        return null;
    }

    return (
        <Card
            className="joint-category-card"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
            styles={{
                body: {
                    padding: 16,
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CustomTitle
                        title={category.toUpperCase()}
                        subtitle={`${joints.length} JOINTS`}
                        level={4}
                    />
                    <ReadOnlyTag reason={readOnlyReason} />
                </div>

                <ReadOnlyHint reason={readOnlyReason}>
                    <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleResetCategory();
                        }}
                        style={{
                            backgroundColor: 'transparent',
                            borderColor: SECONDARY_COLOR,
                            color: TEXT_PRIMARY,
                        }}
                        title={disabled ? undefined : `Reset all ${category} joints to their rest value`}
                    >
                        Reset
                    </Button>
                </ReadOnlyHint>
            </div>

            <div
                className="joint-category-scroll"
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    position: 'relative',
                    zIndex: 2,
                    paddingRight: 10,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    {joints.map((joint) => (
                        <JointControl
                            key={joint.name}
                            joint={joint}
                            onValueChange={onJointValueChange}
                            onReset={onResetJoint}
                            showDegrees={showDegrees}
                            disabled={disabled}
                        />
                    ))}
                </div>
            </div>
        </Card>
    );
});

export default JointCategory;

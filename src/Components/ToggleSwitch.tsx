/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import {
    STATUS_ERROR,
    fonts,
} from '../Constants/theme.ts';

export interface ToggleSwitchProps {
    isOn: boolean;
    onToggle: (next: boolean) => void;
    title: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    textOn?: string;
    textOff?: string;
    width?: number;
    /** `above` stacks the label over the control; `inline` keeps label and control on one row. */
    titlePlacement?: 'above' | 'inline';
    centerTitle?: boolean; /* Only used if placement === 'above'*/
    isOffRed?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    isOn,
    onToggle,
    title,
    leftIcon,
    rightIcon,
    textOn = 'ON',
    textOff = 'OFF',
    width,
    titlePlacement = 'above',
    centerTitle = true,
    isOffRed = true,
}) => {
    const titleStyle: React.CSSProperties = {
        fontFamily: fonts.mono,
        fontSize: 11,
        color: 'var(--color-text-primary)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
    };

    const toggle = (
        <div
            className="tui-toggle"
            style={{
                width: width ? `${width}px` : 'auto',
                display: 'flex',
                border: '1px solid var(--color-secondary)',
                backgroundColor: 'var(--color-main)',
            }}
        >
            <button
                className={`tui-toggle-button${!isOn ? (isOffRed ? ' off' : ' on') : ''}`}
                onClick={() => onToggle(false)}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    boxShadow: 'none',
                    animation: 'none',
                    backgroundColor: !isOn && isOffRed ? STATUS_ERROR : 'transparent',
                    color: !isOn ? (isOffRed ? 'var(--color-text-primary)' : 'var(--color-highlight)') : 'var(--color-text-secondary)',
                    fontFamily: fonts.mono,
                    fontWeight: 'bold',
                    fontSize: 11,
                    padding: '4px 8px',
                    border: 'none',
                    cursor: 'pointer',
                }}
                aria-label={`${title}: ${textOff}`}
            >
                {leftIcon}
                {textOff}
            </button>
            <div style={{ width: 1, backgroundColor: 'var(--color-secondary)' }} />
            <button
                className={`tui-toggle-button${isOn ? ' on' : ''}`}
                onClick={() => onToggle(true)}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    boxShadow: 'none',
                    animation: 'none',
                    backgroundColor: isOn ? 'var(--color-highlight)' : 'transparent',
                    color: isOn ? 'var(--color-text-on-highlight)' : 'var(--color-text-secondary)',
                    fontFamily: fonts.mono,
                    fontWeight: 'bold',
                    fontSize: 11,
                    padding: '4px 8px',
                    border: 'none',
                    cursor: 'pointer',
                }}
                aria-label={`${title}: ${textOn}`}
            >
                {rightIcon}
                {textOn}
            </button>
        </div>
    );

    const titleLabel = (
        <span style={titleStyle}>
            <span style={{ color: 'var(--color-highlight)', fontWeight: 'bold' }}>&gt;</span>
            {title}
        </span>
    );

    if (titlePlacement === 'inline') {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {titleLabel}
                {toggle}
            </div>
        );
    }

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: centerTitle ? 'center' : 'flex-start' }}>
            {titleLabel}
            {toggle}
        </div>
    );
};

export default ToggleSwitch;
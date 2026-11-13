/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import {
    fonts,
    fontSizes,
    fontWeights,
} from '../Constants/theme';

export interface CustomTitleProps {
    title: string;
    prefix?: string;
    separator?: string;
    subtitle?: string;
    underlineSubtitle?: boolean;
    level?: 1 | 2 | 3 | 4 | 5 | 'graphical';
    style?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    subtitleStyle?: React.CSSProperties;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

export const CustomTitle: React.FC<CustomTitleProps> = ({
    title,
    prefix = '>',
    separator = '',
    subtitle,
    underlineSubtitle = true,
    level = 2,
    style,
    titleStyle,
    subtitleStyle,
    className = '',
    align = 'left',
}) => {
    const isGraphical = level === 'graphical' || level === 1;

    const getFontSize = () => {
        switch (level) {
            case 'graphical':
                return fontSizes.graphical;
            case 1:
                return fontSizes.titleWeb;
            case 2:
                return fontSizes.h3;
            case 3:
                return fontSizes.h4;
            case 4:
                return fontSizes.webContent;
            case 5:
                return fontSizes.webSmall;
            default:
                return fontSizes.titleWeb;
        }
    };

    const containerStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
        gap: '8px',
        margin: 0,
        fontFamily: isGraphical ? fonts.graphical : fonts.title,
        fontSize: getFontSize(),
        fontWeight: fontWeights.bold,
        color: 'var(--color-text-primary)',
        letterSpacing: isGraphical ? '2px' : '0.5px',
        textAlign: align,
        lineHeight: 1.25,
        ...style,
    };

    const computedPrefixStyle: React.CSSProperties = {
        color: 'var(--color-highlight)',
        fontFamily: fonts.mono,
        fontWeight: fontWeights.bold,
        userSelect: 'none',
    };

    const computedSeparatorStyle: React.CSSProperties = {
        color: 'var(--color-highlight)',
        fontFamily: fonts.mono,
        fontWeight: fontWeights.bold,
        margin: '0 4px',
        userSelect: 'none',
    };

    const computedSubtitleStyle: React.CSSProperties = {
        color: 'var(--color-text-primary)',
        fontFamily: fonts.mono,
        fontSize: '0.8em',
        fontWeight: fontWeights.regular,
        textTransform: 'uppercase',
        textDecoration: underlineSubtitle ? 'underline' : 'none',
        textDecorationColor: 'var(--color-highlight)',
        letterSpacing: '1px',
        ...subtitleStyle,
    };

    return (
        <div className={`terminal-title-container ${className}`} style={containerStyle}>
            {prefix && <span className="terminal-title-prefix" style={computedPrefixStyle}>{prefix}</span>}
            <span className="terminal-title-text" style={{ color: 'var(--color-text-primary)', ...titleStyle }}>{title}</span>
            {subtitle && (
                <>
                    {separator && <span className="terminal-title-separator" style={computedSeparatorStyle}>{separator}</span>}
                    <span className="terminal-title-subtitle" style={computedSubtitleStyle}>{subtitle}</span>
                </>
            )}
        </div>
    );
};

export default CustomTitle;

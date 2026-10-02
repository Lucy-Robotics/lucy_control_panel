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

export interface TerminalTitleProps {
    /** The main title text */
    title: string;
    /** Optional prefix (defaults to '>') */
    prefix?: string;
    /** Optional separator (defaults to '//') */
    separator?: string;
    /** Optional subtitle text (will be displayed in ALL CAPS) */
    subtitle?: string;
    /** Whether to underline the subtitle (defaults to true) */
    underlineSubtitle?: boolean;
    /** Heading level or style tier */
    level?: 1 | 2 | 3 | 4 | 5 | 'graphical';
    /** Custom CSS styles for container */
    style?: React.CSSProperties;
    /** Custom CSS styles for main title text */
    titleStyle?: React.CSSProperties;
    /** Custom CSS styles for subtitle text */
    subtitleStyle?: React.CSSProperties;
    /** Additional class names */
    className?: string;
    /** Align title */
    align?: 'left' | 'center' | 'right';
}

/**
 * TerminalTitle Component
 * Enforces the Lucy brand title specifications:
 * - Always prefix titles with '>' in #00ff41 (var(--color-highlight))
 * - Separators are '//' in #00ff41 (var(--color-highlight))
 * - Title text in #F7F1E5 (Warm parchment, not white)
 * - Subtitles: ALL CAPS, underline
 * - Fonts: Orbitron for graphical display, IBM Plex Mono for standard titles
 */
export const TerminalTitle: React.FC<TerminalTitleProps> = ({
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
                return fontSizes.titleWeb; // 32px web
            case 2:
                return fontSizes.h3; // 24px
            case 3:
                return fontSizes.h4; // 20px
            case 4:
                return fontSizes.webContent; // 16px
            case 5:
                return fontSizes.webSmall; // 12px
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

export default TerminalTitle;

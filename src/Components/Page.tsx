/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Layout, Grid } from 'antd';
import { useMeasuredHeight } from '../hooks/useMeasuredHeight';
import {
  SPACING_SCREEN_BORDER,
  SPACING_SMALL,
  PAGE_CONTENT_STYLE,
  fonts,
} from '../Constants/theme.ts';
import { AppHeader } from './AppHeader.tsx';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';
import { DockProvider } from '../contexts/DockContext.tsx';
import { TerminalTitle } from './TerminalTitle.tsx';

const { Header, Content } = Layout;
const { useBreakpoint } = Grid;

interface PageProps {
  children: ReactNode;
  title?: boolean;
  showHeader?: boolean;
  contentStyle?: React.CSSProperties;
  removeScrollbars?: boolean;
  className?: string;
}

export const Page: React.FC<PageProps> = ({
  children,
  title,
  showHeader = false,
  contentStyle = {},
  removeScrollbars = false,
  className = '',
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const [headerRef, headerHeight] = useMeasuredHeight<HTMLElement>();

  const screenPadding = isMobile ? SPACING_SMALL : SPACING_SCREEN_BORDER; // 30px screen border desktop, 12px mobile

  const defaultContentStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-main)',
    minHeight: showHeader ? 'calc(100vh - 70px)' : '100vh',
    ...PAGE_CONTENT_STYLE,
    padding: screenPadding,
    ...contentStyle,
  };

  const tuiGlobalCss = `
        /*
          Prevent horizontal jump when Ant Design modals lock body scroll (scrollbar disappears).
          Keeps space for the vertical scrollbar so flex rows / right-aligned content stay put.
        */
        html {
          scrollbar-gutter: stable;
        }

        ${removeScrollbars ? `
        html, body {
          overflow: hidden !important;
        }
        ` : ''}

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .pulse-animation {
          animation: pulse 2s infinite;
        }

        .glitch-effect {
          animation: glitch 0.3s infinite;
        }

        @keyframes robotPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes robotSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes connectionPulse {
          0%, 100% {
            box-shadow: 0 0 8px currentColor;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
            transform: scale(1.2);
          }
        }

        .robot-status-connected {
          animation: connectionPulse 2s infinite ease-in-out;
        }

        .robot-status-disconnected {
          animation: robotPulse 1s infinite ease-in-out;
          filter: brightness(0.7);
        }

        .robot-status-moving {
          animation: robotSpin 1s linear infinite;
        }

        .robot-status-error {
          animation: glitch 0.5s infinite;
          filter: hue-rotate(180deg);
        }
    `;

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--color-main)' }} className={className}>
      <DockProvider>
        {showHeader && (
          <Header
            ref={headerRef}
            className="lucy-page-header"
            style={{
              backgroundColor: 'var(--color-main)',
              borderBottom: '1px solid var(--color-secondary)',
              padding: isMobile ? '8px 12px' : '8px 30px',
              height: 'auto',
              lineHeight: 'normal',
              minHeight: isMobile ? 0 : 48,
              boxSizing: 'border-box',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? 8 : 12,
              width: '100%',
              minHeight: isMobile ? 0 : 32,
            }}>
              {title && (
                <div style={{ flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src="/logo.png"
                    alt="Lucy"
                    style={{
                      height: isMobile ? 22 : 28,
                      width: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      userSelect: 'none',
                    }}
                  />
                  <TerminalTitle
                    title="LUCY"
                    prefix=""
                    separator="//"
                    subtitle="CONTROL PANEL"
                    level={isMobile ? 3 : 2}
                    underlineSubtitle={false}
                    style={{
                      whiteSpace: 'nowrap',
                      flexWrap: 'nowrap',
                      fontFamily: fonts.graphical,
                      fontWeight: 700,
                    }}
                    titleStyle={{
                      fontFamily: fonts.graphical,
                      fontWeight: 700,
                    }}
                    subtitleStyle={{
                      fontFamily: fonts.graphical,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <AppHeader />
              </div>
            </div>
          </Header>
        )}

        <Content style={defaultContentStyle}>
          <HeaderHeightContext.Provider value={headerHeight}>
            {children}
          </HeaderHeightContext.Provider>
        </Content>
      </DockProvider>

      <style>{tuiGlobalCss}</style>
    </Layout>
  );
};

export default Page;

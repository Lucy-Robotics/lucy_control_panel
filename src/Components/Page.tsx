/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Layout, Grid } from 'antd';
import { useMeasuredHeight } from '../hooks/useMeasuredHeight';
import {
  PAGE_CONTENT_STYLE,
  getScreenPadding,
  fonts,
} from '../Constants/theme.ts';
import { AppHeader } from './AppHeader.tsx';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';
import { CustomTitle } from './CustomTitle.tsx';
import { Navigation } from './Navigation.tsx';

const { Header, Content } = Layout;
const { useBreakpoint } = Grid;

interface PageProps {
  children: ReactNode;
  title?: boolean;
  showHeader?: boolean;
  contentStyle?: React.CSSProperties;
  removeScrollbars?: boolean;
  className?: string;
  background?: 'grid' | 'plain';
}

export const Page: React.FC<PageProps> = ({
  children,
  title,
  showHeader = false,
  contentStyle = {},
  removeScrollbars = false,
  className = '',
  background = 'grid',
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const [headerRef, headerHeight] = useMeasuredHeight<HTMLElement>();

  const screenPadding = getScreenPadding(screens);

  const defaultContentStyle: React.CSSProperties = {
    minHeight: showHeader ? 'calc(100vh - 70px)' : '100vh',
    ...PAGE_CONTENT_STYLE,
    padding: screenPadding,
    ...contentStyle,
  };

  const backgroundClass = background === 'grid' ? 'lucy-grid-bg' : 'lucy-plain-bg';

  return (
    <Layout style={{ minHeight: '100vh' }} className={`${backgroundClass} ${className}`.trim()}>
      <>
        {showHeader && (
          <Header
            ref={headerRef}
            className="lucy-page-header"
            style={{
              padding: `8px ${screenPadding}px`,
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
            <div style={!screens.md ? {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 8,
              width: '100%',
            } : {
              // Equal side columns keep the navigation centred on the screen.
              display: 'grid',
              gridTemplateColumns: 'minmax(max-content, 1fr) auto minmax(max-content, 1fr)',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              minHeight: 32,
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
                  <CustomTitle
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
              <Navigation />
              <div style={{ gridColumn: 3, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
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
      </>

      {removeScrollbars && <style>{'html, body { overflow: hidden !important; }'}</style>}
    </Layout>
  );
};

export default Page;

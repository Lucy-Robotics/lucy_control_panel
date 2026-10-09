/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* Layout */
import { ConfigProvider, Layout, Grid } from 'antd';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import type { ComponentType } from 'react';

/* Pages */
import { RobotControlPanel } from './Pages/RobotControlPanel';
const Configuration = lazy(() => import('./Pages/Configuration').then(module => ({ default: module.default })));
const SensorDisplay = lazy(() => import('./Pages/SensorDisplay').then(module => ({ default: module.default })));
const AutomationPage = lazy(() => import('./Pages/AutomationPage').then(module => ({ default: module.default })));
import { Navigation } from './Components/Navigation';
import { NotFound } from './Pages/NotFound';

/* Contexts */
import { ActiveHardwareRosProvider } from './contexts/ActiveHardwareRosContext';
import { PaginatedCategoriesProvider } from './contexts/PaginatedCategoriesContext';
import { useTheme } from './contexts/ThemeContext';

/* Components */
import { AuthForm } from './Components/AuthForm';
import { LucyLoader } from './Components/LucyLoader';
import { Page } from './Components/Page';
import { GettingStartedModal } from './Components/GettingStartedModal';

/* Constants */
import { ROUTES } from './Constants/routes.ts';
import { PAGE_CONTENT_STYLE } from './Constants/uiTheme.ts';

const { useBreakpoint } = Grid;

const PAGE_CONFIG: Record<string, {
    component: ComponentType;
    removeScrollbars: boolean;
    loadingLabel: string;
    loadingDetail: string;
}> = {
    [ROUTES.control]: {
        component: RobotControlPanel,
        removeScrollbars: true,
        loadingLabel: 'LOADING CONTROL PANEL',
        loadingDetail: 'Preparing the robot control panel.',
    },
    [ROUTES.robotConfiguration]: {
        component: Configuration,
        removeScrollbars: false,
        loadingLabel: 'LOADING ROBOT CONFIGURATION',
        loadingDetail: 'Preparing the robot configuration page.',
    },
    [ROUTES.sensors]: {
        component: SensorDisplay,
        removeScrollbars: false,
        loadingLabel: 'LOADING SENSORS',
        loadingDetail: 'Preparing the sensor display.',
    },
    [ROUTES.automation]: {
        component: AutomationPage,
        removeScrollbars: true,
        loadingLabel: 'LOADING AUTOMATION',
        loadingDetail: 'Preparing the automation workflow board.',
    },
};

const RoutedPage = () => {
    const { pathname } = useLocation();
    const screens = useBreakpoint();
    const page = PAGE_CONFIG[pathname];
    const PageComponent = page?.component ?? NotFound;
    let removeScrollbars = page?.removeScrollbars ?? false;

    if (!page?.component) {
        removeScrollbars = true;
    } else if (!screens.md) {
        removeScrollbars = false;
    }

    const isAutomation = pathname === ROUTES.automation;

    return (
        <Page
            showHeader
            title
            removeScrollbars={removeScrollbars}
            contentStyle={{
                ...PAGE_CONTENT_STYLE,
                padding: isAutomation ? 0 : (!screens.md ? 12 : PAGE_CONTENT_STYLE.padding),
                paddingBottom: isAutomation ? (!screens.md ? 72 : 0) : (!screens.md ? 72 : PAGE_CONTENT_STYLE.padding),
                ...(isAutomation && {
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 49px)',
                    minHeight: 'calc(100vh - 49px)',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }),
            }}
        >
            {page ? (
                <Suspense
                    fallback={
                        <LucyLoader
                            label={page.loadingLabel}
                            detail={page.loadingDetail}
                        />
                    }
                >
                    <PageComponent />
                </Suspense>
            ) : (
                <PageComponent />
            )}
        </Page>
    );
};

function App() {
    const { antdThemeConfig } = useTheme();
    const localPassword: string | undefined = import.meta.env.VITE_LOCAL_PASSWORD;
    const localUsername: string | undefined = import.meta.env.VITE_LOCAL_USERNAME;
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string>('');

    useEffect(() => {
        const savedAuth = localStorage.getItem('lucy_auth');
        if (savedAuth) {
            try {
                const { timestamp } = JSON.parse(savedAuth);

                const now = Date.now();
                const authTime = new Date(timestamp).getTime();
                if (now - authTime < 60 * 60 * 1000) { // 1 hour validity
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('lucy_auth');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                localStorage.removeItem('lucy_auth');
            }
        }
    }, []);

    const handleLogin = (user: string) => {
        setIsAuthenticated(true);
        setAuthError('');
        localStorage.setItem('lucy_auth', JSON.stringify({
            username: user,
            timestamp: new Date().toISOString()
        }));
    };

    if (localPassword && localUsername && !isAuthenticated) {
        return (
            <ConfigProvider theme={antdThemeConfig}>
                <AuthForm onLogin={handleLogin} error={authError} />
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider theme={antdThemeConfig}>
            <Router>
                <PaginatedCategoriesProvider>
                    <ActiveHardwareRosProvider>
                        <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--color-main)' }}>
                            <RoutedPage />
                            <Navigation />
                            <GettingStartedModal />
                        </Layout>
                    </ActiveHardwareRosProvider>
                </PaginatedCategoriesProvider>
            </Router>
        </ConfigProvider>
    );
}

export default App;

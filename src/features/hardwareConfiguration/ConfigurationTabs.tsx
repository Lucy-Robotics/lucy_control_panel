/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useContext, useEffect, useState } from 'react';
import { Grid, Tabs } from 'antd';
import { getScreenPadding } from '../../Constants/theme.ts';
import { HeaderHeightContext } from '../../contexts/HeaderHeightContext.ts';
import './configurationTabs.css';
import { HardwareConfigHandler } from '../../Services/ros/handlers/HardwareConfig.handler.ts';
import { RosBridgeService } from '../../Services/ros/ros.service.ts';
import { useActiveHardwareRos } from '../../contexts/ActiveHardwareRosContext.tsx';
import { calibrationTeaser } from './calibration/calibrationTeaser.ts';
import { CalibrationTeaserPage } from './calibration/CalibrationTeaserPage.tsx';
import { CalibrationWizard } from './calibration/CalibrationWizard.tsx';
import { useCalibrationSession } from './calibration/useCalibrationSession.ts';
import ConfigurationPage from './ConfigurationPage.tsx';

/** The robot package wired on the config services, or '' until they answer. */
function useRobotPackage(): string {
    const [robotPackage, setRobotPackage] = useState('');
    useEffect(() => {
        const load = (connected: boolean) => {
            if (!connected) return;
            HardwareConfigHandler.getConfig('')
                .then((config) => setRobotPackage(config.robot_package))
                .catch(() => setRobotPackage(''));
        };
        const service = RosBridgeService.getInstance();
        load(service.isConnected);
        return service.onStatusChange((status) => load(status === 'connected'));
    }, []);
    return robotPackage;
}

/** The Calibrate tab leads: the wizard on real hardware, the teaser page otherwise. */
const ConfigurationTabs = () => {
    const robotPackage = useRobotPackage();
    const session = useCalibrationSession(robotPackage);
    const [tab, setTab] = useState('calibrate');
    const headerHeight = useContext(HeaderHeightContext);
    const screenPadding = getScreenPadding(Grid.useBreakpoint());
    const { servoControlAvailable } = useActiveHardwareRos();

    if (session.supported === null) return <ConfigurationPage />;

    const teaser = calibrationTeaser(robotPackage, session.supported, !servoControlAvailable);
    const wizard = <CalibrationWizard session={session} />;

    return (
        <Tabs
            className={tab === 'calibrate' ? 'lucy-config-tabs lucy-config-tabs--fill' : 'lucy-config-tabs'}
            // The viewport under the header, minus the page's own top and bottom margin
            // (same `screenPadding * 2` the control page subtracts for the same reason).
            style={{ height: `calc(100dvh - ${headerHeight}px - ${screenPadding * 2}px)` }}
            activeKey={tab}
            onChange={setTab}
            destroyInactiveTabPane
            items={[
                {
                    key: 'calibrate',
                    label: 'Calibrate',
                    children: teaser ? (
                        <CalibrationTeaserPage teaser={teaser} onManualConfiguration={() => setTab('yaml')} />
                    ) : (
                        wizard
                    ),
                },
                { key: 'yaml', label: 'Manual Configuration', children: <ConfigurationPage /> },
            ]}
        />
    );
};

export default ConfigurationTabs;

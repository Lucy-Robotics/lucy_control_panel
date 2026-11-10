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

/** Robots with a calibration profile get the wizard first; the others see only the editor. */
const ConfigurationTabs = () => {
    const robotPackage = useRobotPackage();
    const session = useCalibrationSession(robotPackage);
    const [tab, setTab] = useState('calibrate');
    const headerHeight = useContext(HeaderHeightContext);
    const screenPadding = getScreenPadding(Grid.useBreakpoint());

    if (!session.supported) return <ConfigurationPage />;

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
                    children: <CalibrationWizard session={session} />,
                },
                { key: 'yaml', label: 'Hardware YAML', children: <ConfigurationPage /> },
            ]}
        />
    );
};

export default ConfigurationTabs;

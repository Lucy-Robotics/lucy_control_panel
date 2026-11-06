/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useContext, useEffect, useState } from 'react';
import { Grid, Tabs } from 'antd';
import { NAVIGATION_CLEARANCE_VAR } from '../../Components/Navigation.tsx';
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

const SELECTOR_GAP = 12;

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
            // The viewport under the header, ending above the page selector pinned at the bottom.
            style={{
                height: `calc(100dvh - ${headerHeight}px - ${screenPadding}px`
                    + ` - max(${screenPadding}px, var(${NAVIGATION_CLEARANCE_VAR}, 0px) + ${SELECTOR_GAP}px))`,
            }}
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

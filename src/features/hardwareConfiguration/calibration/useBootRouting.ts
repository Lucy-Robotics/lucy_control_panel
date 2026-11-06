/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../Constants/routes.ts';
import { CalibrationHandler } from '../../../Services/ros/handlers/Calibration.handler.ts';
import { startConfigurePipeline } from '../../../Services/ros/handlers/ConfigurePipeline.handler.ts';
import { HardwareConfigHandler } from '../../../Services/ros/handlers/HardwareConfig.handler.ts';
import { RosBridgeService } from '../../../Services/ros/ros.service.ts';
import { bootRoute, type HardwareIdentity } from './calibrationModel.ts';

/** The firmware starts with the stack, so a first "not ready" answer proves nothing. */
const ATTEMPTS = 5;
const RETRY_MS = 3000;

async function activateBoundPreset(identity: HardwareIdentity): Promise<void> {
    const { robot_package: robotPackage } = await HardwareConfigHandler.getConfig('');
    const done = await HardwareConfigHandler.activateConfig(identity.matched_config, robotPackage);
    if (!done.success) throw new Error(done.message);
    const result = await startConfigurePipeline({
        robot_package: robotPackage,
        mapping_file: '',
        boards_to_flash: [],
        dry_run: false,
        build_only: false,
    }).promise;
    if (!result.success) throw new Error(result.message);
}

/** On connecting, act on which arm is plugged in. Mock and simulation route nowhere. */
export function useBootRouting(): void {
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;

        const check = async (attempt: number) => {
            let identity: HardwareIdentity;
            try {
                identity = await CalibrationHandler.identity();
            } catch {
                return; // A backend without calibration: nothing to route on.
            }
            if (cancelled) return;

            const route = bootRoute(identity);
            if (route === 'wizard') {
                if (attempt + 1 < ATTEMPTS && identity.state !== 'no_binding') {
                    timer = window.setTimeout(() => void check(attempt + 1), RETRY_MS);
                    return;
                }
                message.warning(identity.message);
                navigate(ROUTES.robotConfiguration);
            } else if (route === 'activate') {
                const done = message.loading(`Activating ${identity.matched_config} for this arm…`, 0);
                try {
                    await activateBoundPreset(identity);
                    message.success(`${identity.matched_config} is active.`);
                } catch (e) {
                    message.error(`Could not activate the arm's preset: ${String(e)}`);
                    navigate(ROUTES.robotConfiguration);
                } finally {
                    done();
                }
            }
        };

        const service = RosBridgeService.getInstance();
        if (service.isConnected) void check(0);
        const off = service.onStatusChange((status) => {
            window.clearTimeout(timer);
            if (status === 'connected') void check(0);
        });
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            off();
        };
    }, [navigate]);
}

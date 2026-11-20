/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRosConnection } from '../../../hooks/useRosConnection.hook.ts';
import { CalibrationHandler } from '../../../Services/ros/handlers/Calibration.handler.ts';
import { startConfigurePipeline } from '../../../Services/ros/handlers/ConfigurePipeline.handler.ts';
import { HardwareConfigHandler } from '../../../Services/ros/handlers/HardwareConfig.handler.ts';
import {
    EMPTY_STATUS,
    errorHint,
    readableError,
    type CalibrationStatus,
} from './calibrationModel.ts';

export interface CalibrationError {
    code: string;
    message: string;
}

/** The backend session, plus activating the preset it produced. */
export function useCalibrationSession(robotPackage: string) {
    const [status, setStatus] = useState<CalibrationStatus>(EMPTY_STATUS);
    const [supported, setSupported] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<CalibrationError | null>(null);
    const [activated, setActivated] = useState(false);
    const [activation, setActivation] = useState('');
    const mounted = useRef(true);
    const { isConnected } = useRosConnection();

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!isConnected) return;
        return CalibrationHandler.subscribeStatus((next) => {
            setSupported(next.phase !== 'unsupported');
            setStatus(next);
        });
    }, [isConnected]);

    const send = useCallback(async (command: string, argument = ''): Promise<boolean> => {
        setBusy(true);
        setError(null);
        try {
            const result = await CalibrationHandler.command(command, argument);
            if (!mounted.current) return result.success;
            if (result.status) setStatus(result.status);
            if (!result.success) {
                const hint = errorHint(result.error);
                setError({
                    code: result.error,
                    message: hint ? `${result.message} ${hint}` : result.message,
                });
            }
            return result.success;
        } catch (e) {
            if (mounted.current) {
                setError({ code: 'transport', message: e instanceof Error ? e.message : String(e) });
            }
            return false;
        } finally {
            if (mounted.current) setBusy(false);
        }
    }, []);

    /** Same order as the ACTIVATE workflow: pick the preset, then regenerate and reload. */
    const activate = useCallback(async (): Promise<boolean> => {
        setBusy(true);
        setError(null);
        setActivation('Activating the new preset…');
        try {
            const done = await HardwareConfigHandler.activateConfig(status.preset, robotPackage);
            if (!done.success) throw new Error(done.message || 'Could not activate the preset.');
            const run = startConfigurePipeline(
                {
                    robot_package: robotPackage,
                    mapping_file: '',
                    boards_to_flash: [],
                    dry_run: false,
                    build_only: false,
                },
                { onFeedback: (f) => setActivation(f.detail || f.phase) },
            );
            const result = await run.promise;
            if (!result.success) {
                throw new Error(
                    result.errors.map(readableError).join(' ') || result.message || 'The pipeline failed.',
                );
            }
            setActivated(true);
            return true;
        } catch (e) {
            setError({ code: 'activate', message: e instanceof Error ? e.message : String(e) });
            return false;
        } finally {
            setActivation('');
            setBusy(false);
        }
    }, [robotPackage, status.preset]);

    const resetActivation = useCallback(() => setActivated(false), []);

    return {
        status,
        supported,
        busy,
        error,
        activated,
        activation,
        send,
        activate,
        resetActivation,
    };
}

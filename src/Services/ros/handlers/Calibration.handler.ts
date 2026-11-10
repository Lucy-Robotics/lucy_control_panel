/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** ROS transport for the calibration wizard (`lucy_config_pipeline`'s calibration_node). */
import ROSLIB from 'roslib';
import {
    parseStatus,
    type CalibrationStatus,
    type HardwareIdentity,
} from '../../../features/hardwareConfiguration/calibration/calibrationModel.ts';
import { RosBridgeService } from '../ros.service.ts';

const COMMAND_SERVICE = '/lucy/calibration/command';
const IDENTITY_SERVICE = '/lucy/hardware_identity';
const STATUS_TOPIC = '/lucy/calibration/status';

export interface CalibrationCommandResult {
    success: boolean;
    error: string;
    message: string;
    status: CalibrationStatus | null;
}

function call<T>(name: string, serviceType: string, request: Record<string, unknown>): Promise<T> {
    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return Promise.reject(new Error('ROS bridge is not connected.'));
    const service = new ROSLIB.Service({ ros, name, serviceType });
    return new Promise<T>((resolve, reject) => {
        service.callService(
            new ROSLIB.ServiceRequest(request),
            (response: unknown) => resolve(response as T),
            (error: string) => reject(new Error(error)),
        );
    });
}

export class CalibrationHandler {
    static async command(command: string, argument = ''): Promise<CalibrationCommandResult> {
        const raw = await call<{
            success: boolean;
            error: string;
            message: string;
            status_json: string;
        }>(COMMAND_SERVICE, 'lucy_msgs/srv/CalibrationCommand', { command, argument });
        return {
            success: raw.success,
            error: raw.error,
            message: raw.message,
            status: parseStatus(raw.status_json),
        };
    }

    static identity(): Promise<HardwareIdentity> {
        return call<HardwareIdentity>(IDENTITY_SERVICE, 'lucy_msgs/srv/GetHardwareIdentity', {});
    }

    static subscribeStatus(callback: (status: CalibrationStatus) => void): () => void {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return () => {};
        const topic = new ROSLIB.Topic({
            ros,
            name: STATUS_TOPIC,
            messageType: 'std_msgs/msg/String',
        });
        topic.subscribe((message: ROSLIB.Message) => {
            const status = parseStatus((message as unknown as { data: string }).data);
            if (status) callback(status);
        });
        return () => topic.unsubscribe();
    }

    /** Command these joints to `positions` (URDF radians), taking `seconds` to get there. */
    static sendTrajectory(
        topicName: string,
        names: string[],
        positions: number[],
        seconds: number,
    ): void {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros || !topicName || names.length === 0) return;
        const topic = new ROSLIB.Topic({
            ros,
            name: topicName,
            messageType: 'trajectory_msgs/msg/JointTrajectory',
        });
        const sec = Math.floor(seconds);
        topic.publish(new ROSLIB.Message({
            // A zero stamp means "start now" to the JointTrajectoryController.
            header: { stamp: { sec: 0, nanosec: 0 }, frame_id: '' },
            joint_names: names,
            points: [{
                positions,
                time_from_start: { sec, nanosec: Math.round((seconds - sec) * 1e9) },
            }],
        }));
    }
}

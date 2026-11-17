/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

const EYE_LEDS_TOPIC = '/eye_leds';

type Listener = (colors: readonly number[]) => void;

export class EyeLedsHandler {
    private static _instance: EyeLedsHandler | null = null;

    private topic: ROSLIB.Topic | null = null;
    private unsubscribeStatus: (() => void) | null = null;
    private listeners: Set<Listener> = new Set();
    private colors: readonly number[] = [];

    private constructor() {
        this.unsubscribeStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.initTopic();
            } else if (status === 'disconnected') {
                this.topic?.unsubscribe();
                this.topic = null;
                this.setColors([]);
            }
        });
        if (RosBridgeService.getInstance().isConnected) {
            this.initTopic();
        }
    }

    static getInstance(): EyeLedsHandler {
        if (!EyeLedsHandler._instance) {
            EyeLedsHandler._instance = new EyeLedsHandler();
        }
        return EyeLedsHandler._instance;
    }

    subscribe(cb: Listener): () => void {
        this.listeners.add(cb);
        cb(this.colors);
        return () => {
            this.listeners.delete(cb);
        };
    }

    publish(colors: readonly number[]) {
        this.topic?.publish(new ROSLIB.Message({ layout: { dim: [], data_offset: 0 }, data: colors }));
    }

    private setColors(colors: readonly number[]) {
        this.colors = colors;
        this.listeners.forEach((cb) => cb(colors));
    }

    private initTopic() {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return;
        this.topic?.unsubscribe();
        this.topic = new ROSLIB.Topic({
            ros,
            name: EYE_LEDS_TOPIC,
            messageType: 'std_msgs/msg/UInt32MultiArray',
        });
        this.topic.subscribe((msg: ROSLIB.Message) => {
            const data = (msg as unknown as { data?: number[] }).data;
            this.setColors(Array.isArray(data) ? data : []);
        });
    }

    static cleanup() {
        if (EyeLedsHandler._instance) {
            EyeLedsHandler._instance.topic?.unsubscribe();
            EyeLedsHandler._instance.unsubscribeStatus?.();
            EyeLedsHandler._instance = null;
        }
    }
}

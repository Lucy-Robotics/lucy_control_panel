/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';
import { isMockHardware } from '../Utils/productionMode';

export interface UrdfJointLimitRad {
  lowerRad: number;
  upperRad: number;
}

/** Parse URDF XML for revolute/prismatic joint limits (radians). */
export function parseUrdfJointLimits(urdfXml: string): Map<string, UrdfJointLimitRad> {
  const out = new Map<string, UrdfJointLimitRad>();
  if (!urdfXml.trim()) return out;

  const doc = new DOMParser().parseFromString(urdfXml, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.warn('useUrdfJointLimits: failed to parse robot_description XML');
    return out;
  }

  const joints = doc.querySelectorAll('joint');
  joints.forEach((jointEl) => {
    const name = jointEl.getAttribute('name');
    if (!name) return;
    const type = jointEl.getAttribute('type');
    if (type !== 'revolute' && type !== 'prismatic') return;

    const limitEl = jointEl.querySelector('limit');
    if (!limitEl) return;

    const lower = Number(limitEl.getAttribute('lower'));
    const upper = Number(limitEl.getAttribute('upper'));
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper) return;

    out.set(name, { lowerRad: lower, upperRad: upper });
  });

  return out;
}

export interface RobotDescription {
  jointLimits: Map<string, UrdfJointLimitRad>;
  /** `null` until /robot_description arrives. */
  mockHardware: boolean | null;
}

/**
 * Subscribe to latched /robot_description and expose URDF joint limits in radians
 * and whether ros2_control runs on mock hardware.
 */
export function useRobotDescription(isConnected: boolean): RobotDescription {
  const [urdf, setUrdf] = useState('');

  useEffect(() => {
    if (!isConnected) {
      setUrdf('');
      return;
    }

    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return;

    const topic = new ROSLIB.Topic({
      ros,
      name: '/robot_description',
      messageType: 'std_msgs/msg/String',
    });

    const onMessage = (msg: ROSLIB.Message) => {
      const data = (msg as unknown as { data?: string }).data;
      if (typeof data !== 'string' || !data.trim()) return;
      setUrdf(data);
    };

    topic.subscribe(onMessage);
    return () => topic.unsubscribe();
  }, [isConnected]);

  return useMemo(() => ({
    jointLimits: parseUrdfJointLimits(urdf),
    mockHardware: urdf ? isMockHardware(urdf) : null,
  }), [urdf]);
}

export function useUrdfJointLimits(isConnected: boolean): Map<string, UrdfJointLimitRad> {
  return useRobotDescription(isConnected).jointLimits;
}

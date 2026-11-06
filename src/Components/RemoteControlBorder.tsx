/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import { ControlModeHandler } from '../Services/ros/handlers/ControlMode.handler';

/** Frames the whole screen while another client is controlling the robot. */
export const RemoteControlBorder: React.FC = () => {
    const handler = ControlModeHandler.getInstance();
    const [controllerId, setControllerId] = useState(handler.currentControllerId);

    useEffect(() => handler.onControllerChanged(setControllerId), [handler]);

    if (controllerId === '' || controllerId === handler.clientId) return null;

    return <div className="remote-control-border" aria-hidden="true" />;
};

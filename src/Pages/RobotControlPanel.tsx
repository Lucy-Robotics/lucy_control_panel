/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useContext,
    useMemo,
    lazy,
    Suspense,
} from 'react';
import { Typography, Space, Button, Alert, Spin, message, Grid } from 'antd';
import {
    ReloadOutlined,
    ThunderboltOutlined,
    StopOutlined,
    VideoCameraOutlined,
    CodeSandboxOutlined,
    UnorderedListOutlined,
    LayoutOutlined,
} from '@ant-design/icons';

import { JointStateHandler } from "../Services/ros/handlers/JointState.handler";
import { JointMoveContext, createJointMoveStore } from '../hooks/useJointMove';
import { ControlModeHandler } from "../Services/ros/handlers/ControlMode.handler";
import { storageService } from '../Services/storage.service';
import type { SavedAnimation, SavedPose } from '../Services/storage.service';

import { useRosConnection } from "../hooks/useRosConnection.hook";
import { useLiveCameraSources } from '../hooks/useLiveCameraSources.ts';
import { useSensorSources } from '../hooks/useSensorSources.ts';
import { usePersistentBoolean } from '../hooks/usePersistentBoolean.ts';
import { useCloseOnRosDisconnect } from '../hooks/useCloseOnRosDisconnect.ts';
import { useRobotSelection } from '../hooks/useRobotSelection.ts';
import { useStackStatus } from '../hooks/useStackStatus.ts';
import { useEndEffector } from '../hooks/useEndEffector.ts';
import { useDeviceMotionAvailable } from '../hooks/useDeviceMotionAvailable.ts';
import { usePhoneTeleop } from '../hooks/usePhoneTeleop.ts';
import { usePublishTargetPose } from '../hooks/usePublishTargetPose.ts';
import type { JointPositions } from '../Utils/jointStateMessage.ts';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';

import { availableDock, useDock } from '../contexts/DockContext.tsx';
import type { Dock as DockName } from '../contexts/DockContext.tsx';

import type { JointControlState } from '../Constants/robotTypes';
import {
    DEFAULT_ACTUATOR_MAPPING,
    clampServoRad,
    jointRadToServoRad,
    servoRadToJointRad,
    type ActuatorMapping,
} from '../Utils/actuatorJointMapping';
import { describeClient } from '../Utils/clientIdentity';
import {
    DEFAULT_JOINT_SLIDER_BOUNDS_RAD,
    DEFAULT_JOINT_SLIDER_VALUE_RAD,
} from '../Constants/hardwareConfigDefaults';

import { ManagePosesModal } from '../Components/ManagePosesModal';
import { StreamPlayerModal } from "../Components/StreamPlayerModal";
import { Robot3DViewerModal } from "../Components/Robot3DViewerModal";
import { MovableModal } from '../Components/MovableModal';
import { isShowDegreesEnabled } from '../Components/SettingsModal';
import type { ControllerJointConfig } from '../Constants/rosConfig';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_ERROR,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    UI_WARNING,
    UI_BORDER_DIM,
    UI_GRADIENT_MODAL_HEADER,
} from '../Constants/uiTheme.ts';
import { getScreenPadding } from '../Constants/theme.ts';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';
import PaginatedJointCategories from '../Components/ControlPage/PaginatedJointCategories.tsx';
import { CONTROL_OFF_HINT, ReadOnlyTag } from '../Components/ControlPage/ReadOnlyHint.tsx';
import Robot3DViewer from './Robot3DViewer.tsx';
import SensorDisplay from './SensorDisplay.tsx';
import ResizablePanels from '../Components/ControlPage/ResizablePanels.tsx';
import { useMeasuredHeight } from '../hooks/useMeasuredHeight';
import { Dock } from '../Components/ControlPage/Dock.tsx';
import { CommandRail, COMMAND_RAIL_WIDTH } from '../Components/ControlPage/CommandRail.tsx';
import { ShuffleOutlined } from '../Components/ControlPage/ShuffleIcon.tsx';
import { HandOutlined } from '../Components/ControlPage/HandIcon.tsx';
import type { RailGroup } from '../Components/ControlPage/CommandRail.tsx';
import { robotRailGroup } from '../Components/ControlPage/robotRailGroup.tsx';
import { phoneTeleopRailItem } from '../Components/ControlPage/phoneTeleopRailItem.tsx';
import { RobotSwitchConfirmModal } from '../Components/ControlPage/RobotSwitchConfirmModal.tsx';
import { StackProgress } from '../Components/ControlPage/StackProgress.tsx';
import { StreamPlayer } from '../Components/StreamPlayer.tsx';

const MediapipeHandTracker = lazy(() => import('../Components/MediapipeHandTracker').then(module => ({ default: module.default })));

const { Text } = Typography;
const { useBreakpoint } = Grid;

const REFRESH_RATE = 300;

const withJointValue = (joints: JointControlState[], name: string, value: number): JointControlState[] =>
    joints.map((joint) => (joint.name === name ? { ...joint, currentValue: value, targetValue: value } : joint));
const BASE_ANIMATION_INTERVAL = 1000;

interface ControlTakenModalProps {
    isVisible: boolean;
    fighting: boolean;
    onClose: () => void;
    onRetake: () => void;
}

const ControlTakenModal: React.FC<ControlTakenModalProps> = ({
    isVisible,
    fighting,
    onClose,
    onRetake,
}) => (
    <MovableModal
        modalName={fighting ? 'STOP FIGHTING' : 'CONTROL TAKEN'}
        isVisible={isVisible}
        onClose={onClose}
        centered
        initialSize={{ w: 560, h: 280 }}
        header={<ThunderboltOutlined style={{ color: UI_WARNING }} />}
        footer={
            <>
                <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={onRetake}
                    style={{
                        backgroundColor: UI_ACCENT_GREEN,
                        borderColor: UI_ACCENT_GREEN,
                        color: UI_TEXT_ON_ACCENT,
                    }}
                >
                    {fighting ? 'I WILL WIN THIS BATTLE' : 'Retake Control'}
                </Button>
                <Button
                    onClick={onClose}
                    style={{
                        backgroundColor: UI_COLOR_TRANSPARENT,
                        borderColor: UI_BORDER_SOFT,
                        color: UI_TEXT_PRIMARY_ON_DARK,
                    }}
                >
                    {fighting ? "Let's calm down" : 'Close'}
                </Button>
            </>
        }
    >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                {fighting
                    ? 'You and another client keep taking control from each other. Maybe… talk it out?'
                    : <>Another connected client turned Control Robot <Text style={{ color: UI_ACCENT_GREEN }}>ON</Text> and now has exclusive control.</>
                }
            </Text>
            <Text style={{ color: UI_TEXT_SUBTLE }}>
                {fighting
                    ? 'The robot is confused. You should be too.'
                    : <>Your Control Robot was automatically turned <Text style={{ color: UI_ERROR }}>OFF</Text>. Use <Text style={{ color: UI_ACCENT_GREEN }}>Retake Control</Text> to reclaim it.</>
                }
            </Text>
        </Space>
    </MovableModal>
);

/** Value printed under the rail's Dock button. */
const DOCK_SHORT_LABEL: Record<DockName, string> = {
    NONE: 'NONE',
    '3D_VIEW': '3D',
    STREAM: 'STREAM',
    TELEOPERATION: 'HANDS',
    SENSOR_DISPLAY: 'SENSORS',
};

export const RobotControlPanel: React.FC = () => {
    const { isConnected, isConnecting } = useRosConnection();
    const { currentDock, setCurrentDock, isDockLoaded } = useDock();
    const stackStatus = useStackStatus(isConnected);
    const endEffector = useEndEffector(isConnected);
    const hasMotionSensors = useDeviceMotionAvailable();
    const { robots, switchingTo, switchTimedOut, selectRobot, dismissSwitch } = useRobotSelection(isConnected, stackStatus);
    const [robotToConfirm, setRobotToConfirm] = useState<string | null>(null);
    useCloseOnRosDisconnect(robotToConfirm !== null, () => setRobotToConfirm(null));

    const {
        controllerConfigsFromActive,
        productionMode,
        activeHardwareLoading,
        activeHardwareError,
        refetchActiveHardware,
    } = useActiveHardwareRos();

    const actuatorMappingByJointRef = useRef<Map<string, ActuatorMapping>>(new Map());
    const slidersProductionModeRef = useRef(productionMode);

    const [joints, setJoints] = useState<JointControlState[]>([]);
    const [jointMoveStore] = useState(createJointMoveStore);
    const jointsRef = useRef<JointControlState[]>(joints);
    const actualPositionsRef = useRef<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDegrees, setShowDegrees] = useState(isShowDegreesEnabled);
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
    const [activeControllerId, setActiveControllerId] = useState(
        () => ControlModeHandler.getInstance().currentControllerId
    );
    const isSending = activeControllerId === ControlModeHandler.getInstance().clientId;
    const isSendingRef = useRef(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showControlTakenModal, setShowControlTakenModal] = useState(false);
    const retakeCountRef = useRef(0);
    const [controllerToPreempt, setControllerToPreempt] = useState('');
    const [showConfirmTakeControlModal, setShowConfirmTakeControlModal] = useState(false);

    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const screenPadding = getScreenPadding(screens);

    const headerHeight = useContext(HeaderHeightContext);

    const [isStreamVisible, setIsStreamVisible] = usePersistentBoolean('lucy_stream_visible');
    const [isVisualizerVisible, setIsVisualizerVisible] = usePersistentBoolean('lucy_visualizer_visible');

    const { hasLiveCamera } = useLiveCameraSources();
    const sensorSources = useSensorSources();

    const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
    const [webcamAspectRatio, setWebcamAspectRatio] = useState<number | null>(null);
    const [isManagePosesVisible, setIsManagePosesVisible] = useState(false);
    const [railRef, railHeight] = useMeasuredHeight<HTMLDivElement>();

    // Lets sticky elements (the category strip) sit above the bottom toolbar on phones
    useEffect(() => {
        const root = document.documentElement;
        if (isMobile && railHeight > 0) {
            root.style.setProperty('--mobile-nav-height', `${railHeight}px`);
        } else {
            root.style.removeProperty('--mobile-nav-height');
        }
        return () => { root.style.removeProperty('--mobile-nav-height'); };
    }, [isMobile, railHeight]);

    useCloseOnRosDisconnect(isVisualizerVisible, () => setIsVisualizerVisible(false));
    useCloseOnRosDisconnect(isStreamVisible, () => setIsStreamVisible(false));
    useCloseOnRosDisconnect(isWebcamActive, () => setIsWebcamActive(false));

    const isVisualizerDocked = currentDock === '3D_VIEW';
    const isStreamDocked = currentDock === 'STREAM';
    const isTeleoperationDocked = currentDock === 'TELEOPERATION';

    useEffect(() => {
        if (!isDockLoaded) { return; }
        if (isVisualizerDocked) { setIsVisualizerVisible(false); }
        if (isStreamDocked) { setIsStreamVisible(false); }
        if (isTeleoperationDocked) { setIsWebcamActive(false); }
    }, [
        isDockLoaded,
        isVisualizerDocked,
        isStreamDocked,
        isTeleoperationDocked,
        setIsVisualizerVisible,
        setIsStreamVisible,
    ]);
    useCloseOnRosDisconnect(showControlTakenModal, () => {
        retakeCountRef.current = 0;
        setShowControlTakenModal(false);
    });
    useCloseOnRosDisconnect(showConfirmTakeControlModal, () => {
        setControllerToPreempt('');
        setShowConfirmTakeControlModal(false);
    });

    useEffect(() => {
        const handleShowDegreesChange = () => setShowDegrees(isShowDegreesEnabled());
        window.addEventListener('showDegreesChanged', handleShowDegreesChange);
        return () => window.removeEventListener('showDegreesChanged', handleShowDegreesChange);
    }, []);

    const buildJointsFromControllerConfig = useCallback((
        configs: ControllerJointConfig[],
    ): JointControlState[] => {
        const joints: JointControlState[] = [];
        for (const c of configs) {
            for (const name of c.joints) {
                const lim = c.jointLimits?.[name];
                let minValue = DEFAULT_JOINT_SLIDER_BOUNDS_RAD.min;
                let maxValue = DEFAULT_JOINT_SLIDER_BOUNDS_RAD.max;
                let restValue: number | undefined;
                let inverted = false;
                if (lim) {
                    minValue = lim.minRad;
                    maxValue = lim.maxRad;
                    restValue = lim.defaultRad;
                    // Joint angles (production mode) carry an identity mapping, so never inverted there.
                    inverted = lim.mapping.direction * lim.mapping.scale < 0;
                }
                joints.push({
                    name,
                    displayName: c.jointDisplayNames?.[name] ?? name,
                    currentValue: restValue ?? DEFAULT_JOINT_SLIDER_VALUE_RAD,
                    targetValue: restValue ?? DEFAULT_JOINT_SLIDER_VALUE_RAD,
                    minValue,
                    maxValue,
                    type: 'revolute',
                    category: c.defaultCategory,
                    inverted,
                    ...(restValue !== undefined && { restValue }),
                });
            }
        }
        return joints;
    }, []);

    useEffect(() => {
        if (!isConnected) {
            setLoading(false);
            setError(null);
            JointStateHandler.getInstance([]);
            setJoints([]);
            setCategoryOrder([]);
            return;
        }

        if (activeHardwareLoading) {
            setLoading(true);
            setError(null);
            return;
        }

        setLoading(false);

        if (activeHardwareError) {
            setError(activeHardwareError);
            return;
        }

        const ctrls = controllerConfigsFromActive;
        if (!ctrls || ctrls.length === 0) {
            setError('Active hardware config has no joint controllers (check boards / actuators).');
            return;
        }

        setError(null);
        JointStateHandler.getInstance(ctrls);
        const mapByJoint = new Map<string, ActuatorMapping>();
        for (const c of ctrls) {
            for (const name of c.joints) {
                const lim = c.jointLimits?.[name];
                mapByJoint.set(name, lim?.mapping ?? DEFAULT_ACTUATOR_MAPPING);
            }
        }
        // Switching between servo and joint sliders: carry each value over through both mappings
        // so the servo stays where it is (keeping the raw number would move it, e.g. 170 deg -> 2.97 rad).
        const prevMapByJoint = actuatorMappingByJointRef.current;
        const modeSwitched = slidersProductionModeRef.current !== productionMode;
        slidersProductionModeRef.current = productionMode;
        const carry = (name: string, value: number) =>
            modeSwitched
                ? jointRadToServoRad(
                    servoRadToJointRad(value, prevMapByJoint.get(name) ?? DEFAULT_ACTUATOR_MAPPING),
                    mapByJoint.get(name) ?? DEFAULT_ACTUATOR_MAPPING,
                )
                : value;
        actuatorMappingByJointRef.current = mapByJoint;
        if (modeSwitched) actualPositionsRef.current.clear();
        const byName = new Map(jointsRef.current.map((j) => [j.name, j]));
        const nextJoints = buildJointsFromControllerConfig(ctrls).map((j) => {
            const existing = byName.get(j.name);
            return existing
                ? {
                    ...j,
                    currentValue: carry(j.name, existing.currentValue),
                    targetValue: carry(j.name, existing.targetValue),
                }
                : j;
        });
        jointsRef.current = nextJoints;
        setJoints(nextJoints);
        setCategoryOrder((prevOrder) => {
            const nextCats = [...new Set(ctrls.map((c) => c.defaultCategory))];
            const preserved = prevOrder.filter((c) => nextCats.includes(c));
            const extras = nextCats.filter((c) => !preserved.includes(c));
            return [...preserved, ...extras];
        });
    }, [
        isConnected,
        activeHardwareLoading,
        activeHardwareError,
        controllerConfigsFromActive,
        productionMode,
        buildJointsFromControllerConfig,
    ]);

    useEffect(() => {
        jointsRef.current = joints;
    }, [joints]);

    useEffect(() => {
        isSendingRef.current = isSending;
    }, [isSending]);


    useEffect(() => {
        const handler = ControlModeHandler.getInstance();
        return handler.onControllerChanged((controllerId) => {
            if (isSendingRef.current && controllerId !== '' && controllerId !== handler.clientId) {
                setShowControlTakenModal(true);
            }
            setActiveControllerId(controllerId);
        });
    }, []);

    useEffect(() => {
        if (isSending || !isConnected || joints.length === 0) return;
        const unsubscribe = JointStateHandler.getInstance().subscribeToPositions((updates) => {
            setJoints((prev) =>
                prev.map((j) => {
                    const u = updates.find((x) => x.name === j.name);
                    if (!u) return j;
                    const mapping = actuatorMappingByJointRef.current.get(j.name) ?? DEFAULT_ACTUATOR_MAPPING;
                    const servoRad = jointRadToServoRad(u.value, mapping);
                    return { ...j, currentValue: servoRad, targetValue: servoRad };
                })
            );
        });
        return unsubscribe;
    }, [isSending, isConnected, joints.length]);

    useEffect(() => {
        if (!isConnected || joints.length === 0) return;
        const unsubscribe = JointStateHandler.getInstance().subscribeToJointStates((positions) => {
            for (const { name, value } of positions) {
                const mapping = actuatorMappingByJointRef.current.get(name);
                actualPositionsRef.current.set(
                    name,
                    mapping ? jointRadToServoRad(value, mapping) : value,
                );
            }
        });
        return () => { unsubscribe(); actualPositionsRef.current.clear(); };
    }, [isConnected, joints.length]);

    useEffect(() => {
        if (!isConnected || joints.length === 0) return;
        const interval = setInterval(() => {
            setJoints((prev) => {
                let changed = false;
                const notSending = !isSendingRef.current;
                const next = prev.map((j) => {
                    const actual = actualPositionsRef.current.get(j.name);
                    if (actual === undefined) return j;
                    const isFirstFeedback = j.actualValue === undefined;
                    const actualChanged = isFirstFeedback || Math.abs(actual - j.actualValue!) >= 0.0005;
                    if (!actualChanged) return j;
                    changed = true;
                    return {
                        ...j,
                        actualValue: actual,
                        ...(isFirstFeedback && notSending && { currentValue: actual, targetValue: actual }),
                    };
                });
                return changed ? next : prev;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [isConnected, joints.length]);

    useEffect(() => {
        if (!isSending) {
            return;
        }

        const interval = setInterval(() => {
            JointStateHandler.getInstance().publishJointStates(jointsRef.current);
        }, REFRESH_RATE);

        return () => clearInterval(interval);
    }, [isSending]);

    useEffect(() => {
        if (!isSending) return;
        const confirmLeave = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', confirmLeave);
        return () => window.removeEventListener('beforeunload', confirmLeave);
    }, [isSending]);

    const applyControlToggle = useCallback((shouldControl: boolean) => {
        setShowControlTakenModal(false);
        setShowConfirmTakeControlModal(false);
        if (shouldControl) {
            ControlModeHandler.getInstance().takeControl();
        } else {
            ControlModeHandler.getInstance().releaseControl();
        }
    }, []);

    const handleControlRobotToggle = useCallback((shouldControl: boolean) => {
        const handler = ControlModeHandler.getInstance();
        const otherHasControl =
            handler.currentControllerId !== '' && handler.currentControllerId !== handler.clientId;
        if (shouldControl && otherHasControl) {
            setControllerToPreempt(handler.currentControllerId);
            setShowConfirmTakeControlModal(true);
            return;
        }
        applyControlToggle(shouldControl);
    }, [applyControlToggle]);

    const handleJointValueChange = useCallback((name: string, value: number) => {
        setJoints((prevJoints) => withJointValue(prevJoints, name, value));
    }, []);

    const handleGizmoJointCommit = useCallback((name: string, value: number) => {
        handleJointValueChange(name, value);
        if (!isSendingRef.current) return;
        JointStateHandler.getInstance().publishJointStates(withJointValue(jointsRef.current, name, value));
    }, [handleJointValueChange]);

    const handleTeleopJoint = (y: number, jointName: string) => {
        if (!isSendingRef.current) return;
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                if (joint.name !== jointName) return joint;
                const mapping = actuatorMappingByJointRef.current.get(joint.name) ?? DEFAULT_ACTUATOR_MAPPING;
                const a = servoRadToJointRad(joint.minValue, mapping);
                const b = servoRadToJointRad(joint.maxValue, mapping);
                const lo = Math.min(a, b);
                const servo = clampServoRad(
                    jointRadToServoRad(lo + y * (Math.max(a, b) - lo), mapping),
                    joint.minValue,
                    joint.maxValue,
                );
                return { ...joint, currentValue: servo, targetValue: servo };
            })
        );
    }

    const handleResetJoint = useCallback((name: string) => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                if (joint.name === name) {
                    const rest = joint.restValue ?? 0;
                    const clamped = Math.max(joint.minValue, Math.min(joint.maxValue, rest));
                    return { ...joint, currentValue: clamped, targetValue: clamped };
                }
                return joint;
            })
        );
    }, []);

    const handleResetCategory = useCallback((category: string) => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                if (joint.category === category) {
                    const rest = joint.restValue ?? 0;
                    const clamped = Math.max(joint.minValue, Math.min(joint.maxValue, rest));
                    return { ...joint, currentValue: clamped, targetValue: clamped };
                }
                return joint;
            })
        );
    }, []);

    const handleResetAll = useCallback(() => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                const rest = joint.restValue ?? 0;
                const clamped = Math.max(joint.minValue, Math.min(joint.maxValue, rest));
                return { ...joint, currentValue: clamped, targetValue: clamped };
            })
        );
    }, []);

    const handleRandomPose = useCallback(() => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                const value = joint.minValue + Math.random() * (joint.maxValue - joint.minValue);
                return { ...joint, currentValue: value, targetValue: value };
            })
        );
    }, []);

    const categorizedJoints = useMemo(() => {
        const categories: { [key: string]: JointControlState[] } = {};
        joints.forEach((joint) => {
            const key = joint.category ?? 'Uncategorized';
            if (!categories[key]) {
                categories[key] = [];
            }
            categories[key].push(joint);
        });
        return categories;
    }, [joints]);

    const poseJoints = useMemo(
        () => joints.map((joint) => ({
            ...joint,
            currentValue: servoRadToJointRad(
                joint.currentValue,
                actuatorMappingByJointRef.current.get(joint.name) ?? DEFAULT_ACTUATOR_MAPPING,
            ),
        })),
        [joints],
    );

    const handleLoadPose = useCallback(
        (poseJoints: Record<string, number>, categoryOrder?: string[]) => {
            setJoints((prevJoints) =>
                prevJoints.map((joint) => {
                    const jointRad = poseJoints[joint.name];
                    if (jointRad === undefined) return joint;
                    const mapping = actuatorMappingByJointRef.current.get(joint.name) ?? DEFAULT_ACTUATOR_MAPPING;
                    const value = clampServoRad(jointRadToServoRad(jointRad, mapping), joint.minValue, joint.maxValue);
                    return { ...joint, currentValue: value, targetValue: value };
                })
            );

            if (categoryOrder) {
                setCategoryOrder(categoryOrder);
            }
        },
        []
    );

    const handleStopAnimation = useCallback(() => {
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }
        setIsAnimating(false);
        message.info('Animation stopped');
    }, []);

    // An animation must not outlive our control: the toggle can go OFF on its own
    // when another client takes over.
    useEffect(() => {
        if (!isSending && isAnimating) {
            handleStopAnimation();
        }
    }, [isSending, isAnimating, handleStopAnimation]);

    const handlePlayAnimation = useCallback(async (animation: SavedAnimation) => {
        // Playback drives the sliders, which only reach the robot while we publish.
        if (!isSendingRef.current) {
            message.info(CONTROL_OFF_HINT);
            return;
        }
        if (isAnimating) {
            handleStopAnimation();
        }

        setIsAnimating(true);
        message.success(`Playing animation: "${animation.name}"`);

        const poses = (await Promise.all(
            animation.poseIds.map(id => storageService.loadPose(id))
        )).filter((p): p is SavedPose => p !== null);

        if (poses.length < animation.poseIds.length) {
            message.error('Some poses in the animation could not be found.');
            setIsAnimating(false);
            return;
        }

        let currentIndex = 0;
        let completedLoops = 0;
        const playNextFrame = () => {
            handleLoadPose(poses[currentIndex].joints);
            currentIndex++;

            if (currentIndex >= poses.length) {
                completedLoops++;
                const hasMoreLoops = animation.loop
                    && (animation.loopCount === 0 || completedLoops < animation.loopCount);
                if (hasMoreLoops) {
                    currentIndex = 0;
                } else {
                    setIsAnimating(false);
                    message.success('Animation finished');
                    return;
                }
            }

            animationTimeoutRef.current = setTimeout(
                playNextFrame,
                BASE_ANIMATION_INTERVAL / animation.speed
            );
        };

        playNextFrame();
    }, [isAnimating, handleLoadPose, handleStopAnimation]);

    const handleIkSolution = useCallback((positions: JointPositions) => {
        if (!isSendingRef.current) return;
        const next = jointsRef.current.map((joint) => {
            const jointRad = positions[joint.name];
            if (jointRad === undefined) return joint;
            const mapping = actuatorMappingByJointRef.current.get(joint.name) ?? DEFAULT_ACTUATOR_MAPPING;
            const value = clampServoRad(jointRadToServoRad(jointRad, mapping), joint.minValue, joint.maxValue);
            return { ...joint, currentValue: value, targetValue: value };
        });
        jointsRef.current = next;
        setJoints(next);
        JointStateHandler.getInstance().publishJointStates(next);
    }, []);

    const phoneTeleop = usePhoneTeleop(isSending && endEffector !== null && hasMotionSensors, endEffector, handleIkSolution);
    usePublishTargetPose(jointMoveStore, joints, isSending);

    if (switchingTo || !isConnected || stackStatus?.status === 'loading') {
        return (
            <StackProgress
                target={switchingTo}
                robot={robots?.active ?? null}
                status={stackStatus}
                isConnected={isConnected}
                timedOut={switchTimedOut}
                connectButton={!isConnected && !isConnecting}
                onDismiss={dismissSwitch}
            />
        );
    }

    if (isConnected && loading) {
        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" />
                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginLeft: 16 }}>
                        Loading robot configuration...
                    </Text>
                </div>
                <ControlTakenModal
                    isVisible={showControlTakenModal}
                    fighting={retakeCountRef.current >= 3}
                    onClose={() => {
                        retakeCountRef.current = 0;
                        setShowControlTakenModal(false);
                    }}
                    onRetake={() => {
                        retakeCountRef.current += 1;
                        setShowControlTakenModal(false);
                        applyControlToggle(true);
                    }}
                />
            </>
        );
    }

    if (isConnected && error) {
        return (
            <>
                <Alert
                    message="Error Loading Robot Configuration"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button size="small" onClick={() => void refetchActiveHardware()}>
                            Retry
                        </Button>
                    }
                />
                <ControlTakenModal
                    isVisible={showControlTakenModal}
                    fighting={retakeCountRef.current >= 3}
                    onClose={() => {
                        retakeCountRef.current = 0;
                        setShowControlTakenModal(false);
                    }}
                    onRetake={() => {
                        retakeCountRef.current += 1;
                        setShowControlTakenModal(false);
                        applyControlToggle(true);
                    }}
                />
            </>
        );
    }

    const showVisualizerWindow = isVisualizerVisible && !isVisualizerDocked;
    const showStreamWindow = isStreamVisible && !isStreamDocked;
    const isStreamDisabled = isStreamDocked || (!hasLiveCamera && !isStreamVisible);
    const hasSensors = sensorSources.length > 0;

    const dockContent = (
        <Dock
            childrens={{
                '3D_VIEW': (
                    <Robot3DViewer
                        docked
                        isControlOn={isSending}
                        joints={joints}
                        onJointValueChange={handleGizmoJointCommit}
                        teleopTarget={phoneTeleop.target}
                    />
                ),
                'STREAM': <StreamPlayer />,
                'TELEOPERATION': (
                    <Suspense fallback={<Spin size="large" />}>
                        <MediapipeHandTracker moveRobotIndex={handleTeleopJoint} />
                    </Suspense>
                ),
                'SENSOR_DISPLAY': <SensorDisplay />,
                'NONE': null,
            }}
            current={currentDock}
        />
    );

    // Control Robot OFF publishes nothing, so every command control is inert.
    const readOnlyReason = isSending ? undefined : CONTROL_OFF_HINT;

    const dockLabel = (dock: DockName) => {
        if (dock === 'NONE') return 'No dock';
        if (dock === 'TELEOPERATION') return 'Hands';
        if (dock === 'SENSOR_DISPLAY') return `Sensors${hasSensors ? '' : ' (unavailable)'}`;
        if (dock === 'STREAM') return `Stream${hasLiveCamera ? '' : ' (unavailable)'}`;
        return dock.replace('_', ' ');
    };

    const railArm = {
        isOn: isSending,
        onToggle: () => handleControlRobotToggle(!isSending),
        hint: `Control Robot: ${isSending ? 'ON' : 'OFF'}. If another connected client turns Control Robot ON, yours will be automatically turned OFF`,
    };

    const robotGroup = robotRailGroup({ robots, switchingTo, canSwitch: isSending, onSelect: setRobotToConfirm });

    const railGroups: RailGroup[] = [
        ...(robotGroup ? [robotGroup] : []),
        {
            key: 'pose',
            code: 'POSE',
            items: [
                {
                    key: 'reset',
                    icon: <ReloadOutlined />,
                    label: 'Reset all joints',
                    caption: 'RESET',
                    onClick: handleResetAll,
                    disabled: !isSending,
                    disabledReason: CONTROL_OFF_HINT,
                },
                isAnimating
                    ? {
                        key: 'stop',
                        icon: <StopOutlined />,
                        label: 'Stop animation',
                        caption: 'STOP',
                        onClick: handleStopAnimation,
                        danger: true,
                    }
                    : {
                        key: 'random',
                        icon: <ShuffleOutlined />,
                        label: 'Random pose',
                        caption: 'RANDOM',
                        onClick: handleRandomPose,
                        disabled: !isSending,
                        disabledReason: CONTROL_OFF_HINT,
                    },
                {
                    key: 'poses',
                    icon: <UnorderedListOutlined />,
                    label: 'Manage poses & animations',
                    caption: 'POSES',
                    onClick: () => setIsManagePosesVisible(true),
                },
            ],
        },
        {
            key: 'mode',
            code: 'MODE',
            items: [
                {
                    key: 'hands',
                    icon: <HandOutlined />,
                    label: `Hands: the robot follows your hand through the camera${isSending ? '' : ` (${CONTROL_OFF_HINT})`}`,
                    caption: 'HANDS',
                    onClick: () => setIsWebcamActive(v => !v),
                    active: isWebcamActive,
                    disabled: isTeleoperationDocked,
                    disabledReason: 'Hands is currently displayed in the dock',
                },
                phoneTeleopRailItem({
                    isOn: phoneTeleop.isOn,
                    onToggle: phoneTeleop.toggle,
                    isSending,
                    hasMotionSensors,
                    hasEndEffector: endEffector !== null,
                }),
            ],
        },
        {
            key: 'layout',
            code: 'LAYOUT',
            pinEnd: true,
            items: [
                {
                    key: '3d-view',
                    icon: <CodeSandboxOutlined />,
                    label: showVisualizerWindow ? 'Hide 3D view window' : 'Show 3D view window',
                    caption: '3D VIEW',
                    onClick: () => setIsVisualizerVisible(v => !v),
                    active: showVisualizerWindow,
                    disabled: isVisualizerDocked,
                    disabledReason: '3D view is currently displayed in the dock',
                },
                {
                    key: 'stream',
                    icon: <VideoCameraOutlined />,
                    label: showStreamWindow ? 'Hide stream window' : 'Show stream window',
                    caption: 'STREAM',
                    onClick: () => setIsStreamVisible(v => !v),
                    active: showStreamWindow,
                    disabled: isStreamDisabled,
                    disabledReason: isStreamDocked
                        ? 'Stream is currently displayed in the dock'
                        : 'No camera is publishing',
                },
                {
                    key: 'dock',
                    icon: <LayoutOutlined />,
                    label: `Docked panel: ${dockLabel(currentDock)} (click to change)`,
                    caption: 'DOCK',
                    detail: DOCK_SHORT_LABEL[currentDock],
                    menu: {
                        selectable: true,
                        selectedKeys: [currentDock],
                        onClick: ({ key }) => setCurrentDock(key as DockName),
                        items: [
                            { key: 'dock-title', type: 'group', label: 'DOCKED PANEL' },
                            ...availableDock.map((dock) => ({
                                key: dock,
                                label: dockLabel(dock),
                                disabled: (dock === 'STREAM' && !hasLiveCamera)
                                    || (dock === 'SENSOR_DISPLAY' && !hasSensors),
                            })),
                        ],
                    },
                },
            ],
        },
    ];

    return (
        <JointMoveContext.Provider value={jointMoveStore}>
            <Robot3DViewerModal
                isVisible={showVisualizerWindow}
                onClose={() => setIsVisualizerVisible(false)}
                isControlOn={isSending}
                joints={joints}
                onJointValueChange={handleGizmoJointCommit}
                teleopTarget={phoneTeleop.target}
            />

            <StreamPlayerModal
                isVisible={showStreamWindow}
                onClose={() => setIsStreamVisible(false)}
            />

            <ManagePosesModal
                joints={poseJoints}
                controlEnabled={isSending}
                onLoadPose={handleLoadPose}
                onPlayAnimation={handlePlayAnimation}
                isAnimating={isAnimating}
                onStopAnimation={handleStopAnimation}
                isVisible={isManagePosesVisible}
                onVisibleChange={setIsManagePosesVisible}
                showTrigger={false}
            />

            {(
                <div
                    style={{
                        position: 'relative',
                        isolation: 'isolate',
                        display: 'flex',
                        flexDirection: 'column',
                        height: isMobile
                            ? 'auto'
                            : `calc(100dvh - ${headerHeight}px - ${screenPadding * 2}px)`,
                        minHeight: isMobile
                            ? `calc(100dvh - ${headerHeight}px - ${screenPadding * 2}px - ${railHeight}px)`
                            : 0,
                        // Keeps the last content clear of the fixed bottom toolbar
                        paddingBottom: isMobile ? railHeight : 0,
                    }}
                >
                    {isMobile && (
                        <CommandRail
                            ref={railRef}
                            orientation="horizontal"
                            groups={railGroups}
                            arm={railArm}
                            className="command-rail-bottom"
                        />
                    )}

                    {isMobile && isWebcamActive && (
                        <div
                            className="chamfer-box"
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '33.333vh',
                                marginBottom: 12,
                                flexShrink: 0,
                                '--chamfer': '12px',
                            } as React.CSSProperties}
                        >
                            <div
                                style={{
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 8px',
                                    background: UI_GRADIENT_MODAL_HEADER,
                                    borderBottom: `1px solid ${UI_BORDER_DIM}`,
                                }}
                            >
                                <Space size={8} align="center">
                                    <span style={{ color: UI_ACCENT_GREEN, fontFamily: 'monospace', fontSize: 12 }}>
                                        WEBCAM
                                    </span>
                                    <ReadOnlyTag reason={readOnlyReason} />
                                </Space>
                                <Button size="small" danger onClick={() => setIsWebcamActive(false)}>
                                    X
                                </Button>
                            </div>
                            <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }} />}>
                                <MediapipeHandTracker moveRobotIndex={handleTeleopJoint} />
                            </Suspense>
                        </div>
                    )}

                    {isMobile ? (
                        <>
                            {currentDock !== 'NONE' && (
                                <div
                                    style={{
                                        width: '100%',
                                        position: 'sticky',
                                        top: headerHeight + screenPadding,
                                        zIndex: 4,
                                        backgroundColor: 'var(--color-main)',
                                        height: '34vh',
                                        minHeight: 204,
                                        marginBottom: 12,
                                        flexShrink: 0,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {dockContent}
                                </div>
                            )}
                            <div style={{ width: '100%', minHeight: 0 }}>
                                <PaginatedJointCategories
                                    categoryOrder={categoryOrder}
                                    categorizedJoints={categorizedJoints}
                                    onJointValueChange={handleJointValueChange}
                                    onResetCategory={handleResetCategory}
                                    onResetJoint={handleResetJoint}
                                    showDegrees={showDegrees}
                                    disabled={!isSending}
                                />
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                flex: 1,
                                minHeight: 0,
                                display: 'flex',
                                gap: 16,
                            }}
                        >
                            <CommandRail
                                orientation="vertical"
                                groups={railGroups}
                                arm={railArm}
                                style={{ alignSelf: 'stretch', flexShrink: 0, width: COMMAND_RAIL_WIDTH }}
                            />
                            <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                                <ResizablePanels
                                    direction="horizontal"
                                    proportions={currentDock === "NONE" ? [100] : [30, 70]}
                                    minSize={25}
                                    gap={20}
                                >
                                    <PaginatedJointCategories
                                        categoryOrder={categoryOrder}
                                        categorizedJoints={categorizedJoints}
                                        onJointValueChange={handleJointValueChange}
                                        onResetCategory={handleResetCategory}
                                        onResetJoint={handleResetJoint}
                                        showDegrees={showDegrees}
                                        disabled={!isSending}
                                    />

                                    {currentDock !== "NONE" && dockContent}
                                </ResizablePanels>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isMobile && (
                <MovableModal
                    modalName="WEBCAM"
                    header={<ReadOnlyTag reason={readOnlyReason} />}
                    isVisible={isWebcamActive}
                    onClose={() => setIsWebcamActive(false)}
                    initialPosition={{ x: 400, y: 150 }}
                    initialSize={{ w: 480, h: 400 }}
                    contentPadding={0}
                    contentAspectRatio={webcamAspectRatio}
                >
                    {isWebcamActive && (
                        <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }} />}>
                            <MediapipeHandTracker
                                moveRobotIndex={handleTeleopJoint}
                                onAspectRatioChange={setWebcamAspectRatio} />
                        </Suspense>
                    )}
                </MovableModal>
            )}

            <ControlTakenModal
                isVisible={showControlTakenModal}
                fighting={retakeCountRef.current >= 3}
                onClose={() => {
                    retakeCountRef.current = 0;
                    setShowControlTakenModal(false);
                }}
                onRetake={() => {
                    retakeCountRef.current += 1;
                    setShowControlTakenModal(false);
                    applyControlToggle(true);
                }}
            />

            <RobotSwitchConfirmModal
                robotPackage={robotToConfirm}
                onCancel={() => setRobotToConfirm(null)}
                onConfirm={(robotPackage) => {
                    setRobotToConfirm(null);
                    selectRobot(robotPackage);
                }}
            />

            <MovableModal
                modalName="TAKE CONTROL FROM ANOTHER CLIENT?"
                isVisible={showConfirmTakeControlModal}
                onClose={() => setShowConfirmTakeControlModal(false)}
                centered
                initialSize={{ w: 500, h: 300 }}
                header={<ThunderboltOutlined style={{ color: UI_WARNING }} />}
                footer={[
                    <Button
                        key="take"
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={() => applyControlToggle(true)}
                        style={{
                            backgroundColor: UI_ACCENT_GREEN,
                            borderColor: UI_ACCENT_GREEN,
                            color: UI_TEXT_ON_ACCENT,
                        }}
                    >
                        Take Control Anyway
                    </Button>,
                    <Button
                        key="cancel"
                        onClick={() => setShowConfirmTakeControlModal(false)}
                        style={{
                            backgroundColor: UI_COLOR_TRANSPARENT,
                            borderColor: UI_BORDER_SOFT,
                            color: UI_TEXT_PRIMARY_ON_DARK,
                        }}
                    >
                        Cancel
                    </Button>,
                ]}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                        The robot is currently controlled by {describeClient(controllerToPreempt)}.
                    </Text>
                    <Text style={{ color: UI_TEXT_SUBTLE }}>
                        Control is exclusive: their Control Robot switches to <Text style={{ color: UI_ERROR }}>OFF</Text> immediately,
                        and they are told you took over.
                    </Text>
                </Space>
            </MovableModal>

        </JointMoveContext.Provider>
    );
};

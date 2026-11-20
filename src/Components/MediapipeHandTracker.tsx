/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HAND_CONNECTIONS, Hands, type Results, type Handedness } from "@mediapipe/hands";
import React, { useEffect, useMemo, useRef } from "react";
import Webcam from "react-webcam";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { ControlMode, controlModeForRobotPackage, HANDS_MODEL_CONFIG, MEDIAPIPE_HANDS_URL } from "../Constants/MediaPipe";
import { useActiveHardwareRos } from "../contexts/ActiveHardwareRosContext";

const UPDATE_HZ_S = 5;

/** Bend angle (rad) at which a joint counts as straight / fully bent, and its share of the finger's flex. */
type JointLimits = { straight: number; bent: number; weight: number };

// Measured in pixel space, palm facing the camera, over two recordings (open hand ≤ 0.19 rad on
// every joint). Order: tip joint (DIP), middle joint (PIP), knuckle (MCP).
// The PIP has the widest and steadiest range, so it carries the most weight; the DIP is the noisiest.
const FINGER_JOINT_LIMITS: JointLimits[] = [
    { straight: 0.15, bent: 0.65, weight: 0.2 },
    { straight: 0.20, bent: 1.80, weight: 0.5 },
    { straight: 0.25, bent: 0.75, weight: 0.3 }, // reads low in a palm-facing fist: it bends toward the camera
];
// Thumb chain: IP joint, MCP joint, CMC. The CMC angle barely moves (~0.5 open and closed), so it is ignored.
// The "bent" ends are low enough to cover a thumb tucked over the fingers or held alongside them.
const THUMB_JOINT_LIMITS: JointLimits[] = [
    { straight: 0.25, bent: 0.80, weight: 0.5 },
    { straight: 0.20, bent: 0.50, weight: 0.5 },
    { straight: 0, bent: 1, weight: 0 },
];

/** Claw control reads a single pinch; finger control tracks both hands. */
function maxNumHandsFor(mode: ControlMode): number {
    return mode === ControlMode.Claw ? 1 : 2;
}


interface MediapipeHandTrackerProps {
    width?: number;
    height?: number;
    moveRobotIndex: (x: number, jointName: string) => void;
    onAspectRatioChange?: (ratio: number) => void;
}

const MediapipeHandTracker: React.FC<MediapipeHandTrackerProps> = ({
    width,
    height,
    moveRobotIndex,
    onAspectRatioChange
}) => {
    type Point3D = { x: number; y: number; z: number };
    type Finger3D = { tip: Point3D, dip: Point3D, pip: Point3D, mcp: Point3D, wrist: Point3D, jointNames: string[], limits: JointLimits[] };
    type Finger3DSample = { point1: Point3D, point2: Point3D, point3: Point3D };
    type Finger3DIndex = { TIP: number, DIP: number, PIP: number, MCP: number }
    // i1 (inmoov_urdf) and i2 (inmoov_i2_urdf) joint per finger; only the loaded robot has one, the other is a no-op.
    type FingerIndex = { names: string[], idx: Finger3DIndex, limits: JointLimits[] }

    const Fingers: Array<FingerIndex> = [
        {
            names: ["i01.side.thumb_link_joint", "i02_side_ThumbMid_joint"], idx: {
                TIP: 4,
                DIP: 3,
                PIP: 2,
                MCP: 1
            }, limits: THUMB_JOINT_LIMITS
        },
        {
            names: ["i01.side.index_link_joint", "i02_side_indexPhal_joint"], idx: {
                TIP: 8,
                DIP: 7,
                PIP: 6,
                MCP: 5
            }, limits: FINGER_JOINT_LIMITS
        },
        {
            names: ["i01.side.majeure_link_joint", "i02_side_majeurePhal_joint"], idx: {
                TIP: 12,
                DIP: 11,
                PIP: 10,
                MCP: 9
            }, limits: FINGER_JOINT_LIMITS
        },
        {
            names: ["i01.side.ringFinger_link_joint", "i02_side_ringFingerPhal_joint"], idx: {
                TIP: 16,
                DIP: 15,
                PIP: 14,
                MCP: 13
            }, limits: FINGER_JOINT_LIMITS
        },
        {
            names: ["i01.side.pinky_link_joint", "i02_side_pinkyPhal_joint"], idx: {
                TIP: 20,
                DIP: 19,
                PIP: 18,
                MCP: 17
            }, limits: FINGER_JOINT_LIMITS
        },
    ]

    const videoConstraints = useMemo(
        () => (width || height ? { width, height } : undefined),
        [width, height]
    );

    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const reportedRatioRef = useRef<number | null>(null);
    const aspectRatioCallbackRef = useRef(onAspectRatioChange);
    aspectRatioCallbackRef.current = onAspectRatioChange;
    const handsRef = useRef<Hands | null>(null);

    const { serverRobotPackage } = useActiveHardwareRos();
    const controlMode = useMemo(
        () => controlModeForRobotPackage(serverRobotPackage),
        [serverRobotPackage],
    );
    const controlModeRef = useRef<ControlMode>(controlMode);
    controlModeRef.current = controlMode;

    const onResults = (results: Results) => {
        if (!webcamRef.current?.video || !canvasRef.current) return;

        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;
        // Assigning width/height reallocates and wipes the canvas even when the value is unchanged,
        // so only do it when the video size actually changes.
        if (canvasRef.current.width !== videoWidth || canvasRef.current.height !== videoHeight) {
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
        }

        if (videoWidth && videoHeight) {
            const ratio = videoWidth / videoHeight;
            if (reportedRatioRef.current !== ratio) {
                reportedRatioRef.current = ratio;
                aspectRatioCallbackRef.current?.(ratio);
            }
        }

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        // The canvas only carries the overlay; the live <Webcam> video shows through underneath
        // at full frame rate instead of being repainted at the model's rate.
        ctx.save();
        ctx.clearRect(0, 0, videoWidth, videoHeight);

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                    color: "#00FF00",
                    lineWidth: 4,
                });
                drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });
            }
        }
        // The pump already limits the model to UPDATE_HZ_S, so every result is used.
        // Normalized landmarks scale x by width and y by height, which skews angles and
        // distances; convert to pixels so every axis shares one unit (z follows x's scale).
        // World landmarks were tried and rejected: their depth estimate drifts when
        // fingertips occlude each other, e.g. during a pinch.
        const pixelHands: Point3D[][] = (results.multiHandLandmarks ?? []).map((hand) =>
            hand.map((p) => ({ x: p.x * videoWidth, y: p.y * videoHeight, z: p.z * videoWidth }))
        );
        processHands(pixelHands, results.multiHandedness);

        ctx.restore();
    };

    function processHands(hands: Point3D[][], handedness: Handedness[]) {
        if (hands.length === 0) return;

        // The mode is a per-frame decision. The claw follows a single hand: the first one
        // detected, so a second hand (e.g. right after a robot swap, before maxNumHands drops
        // to 1) can't fight it for the Jaw.
        if (controlModeRef.current === ControlMode.Claw) {
            processClaw(hands[0]);
            return;
        }

        hands.forEach((hand, handIndex) => {
            const side = handedness[handIndex]?.label === "Left" ? "leftHand" : "rightHand";

            for (const finger of Fingers) {
                processFinger({
                    tip: hand[finger.idx.TIP],
                    dip: hand[finger.idx.DIP],
                    pip: hand[finger.idx.PIP],
                    mcp: hand[finger.idx.MCP],
                    wrist: hand[0],
                    jointNames: finger.names.map((name) => name.replace("side", side)),
                    limits: finger.limits,
                });
            }
        });
    };

    function processClaw(hand: Point3D[]) {
        const thumbTip = hand[4];
        const fingerTips = [hand[8], hand[12], hand[16], hand[20]]; // index, middle, ring, pinky

        const avgTip: Point3D = {
            x: fingerTips.reduce((sum, p) => sum + p.x, 0) / fingerTips.length,
            y: fingerTips.reduce((sum, p) => sum + p.y, 0) / fingerTips.length,
            z: fingerTips.reduce((sum, p) => sum + p.z, 0) / fingerTips.length,
        };

        const pinchDistance = distance3D(thumbTip, avgTip);

        // Normalize by hand size (wrist to middle-finger MCP) so pinch detection
        // doesn't depend on how close the hand is to the camera
        const handScale = distance3D(hand[0], hand[9]);
        const normalizedDistance = handScale > 0 ? pinchDistance / handScale : 0;

        const clawOpenness = clawPercentage(normalizedDistance);

        moveRobotIndex(clawOpenness, `Jaw`);
    }

    function distance3D(a: Point3D, b: Point3D): number {
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    // Returns 0 (pinched/closed) to 1 (fully open) from a normalized thumb-to-fingers distance
    function clawPercentage(normalizedDistance: number): number {
        // Measured in pixel space: pinched ≈ 0.24–0.61 (higher when the hand is rotated),
        // fully spread ≈ 1.71–1.93.
        const pinchedLowerLimit = 0.45; // at or below: claw fully closed
        const openHigherLimit = 1.6;    // at or above: claw fully open

        const clamp = (value: number, min: number, max: number): number =>
            Math.min(Math.max(value, min), max);

        const clamped = clamp(normalizedDistance, pinchedLowerLimit, openHigherLimit);
        return (clamped - pinchedLowerLimit) / (openHigherLimit - pinchedLowerLimit);
    }

    function processFinger(finger: Finger3D) {
        const sample1: Finger3DSample = { point1: finger.tip, point2: finger.dip, point3: finger.pip };
        const sample2: Finger3DSample = { point1: finger.dip, point2: finger.pip, point3: finger.mcp };
        const sample3: Finger3DSample = { point1: finger.pip, point2: finger.mcp, point3: finger.wrist };

        const angle1: number = angleBetweenPoints3D(sample1);
        const angle2: number = angleBetweenPoints3D(sample2);
        const angle3: number = angleBetweenPoints3D(sample3);
        const flex: number = flexingPercentage([angle1, angle2, angle3], finger.limits);

        finger.jointNames.forEach((name) => moveRobotIndex(flex, name));
    };

    // Returns a value between 0 (fully relaxed) and 1 (fully flexed): each joint angle is mapped
    // to 0–1 between its own straight/bent limits, then combined by the joints' weights.
    function flexingPercentage(angles: number[], limits: JointLimits[]): number {
        const clamp = (value: number, min: number, max: number): number =>
            Math.min(Math.max(value, min), max);

        let weighted = 0;
        let totalWeight = 0;
        angles.forEach((angle, j) => {
            const { straight, bent, weight } = limits[j];
            weighted += weight * (clamp(angle, straight, bent) - straight) / (bent - straight);
            totalWeight += weight;
        });
        return totalWeight > 0 ? weighted / totalWeight : 0;
    }

    // Returns the angle of flexion (in radians) of a joint (= 3 3D points)
    function angleBetweenPoints3D(
        // a: Point3D,
        // b: Point3D,
        // c: Point3D
        sample: Finger3DSample
    ): number {
        // Build vectors "BA" and "BC" for the math formula
        const v1x = sample.point1.x - sample.point2.x;
        const v1y = sample.point1.y - sample.point2.y;
        const v1z = sample.point1.z - sample.point2.z;

        const v2x = sample.point3.x - sample.point2.x;
        const v2y = sample.point3.y - sample.point2.y;
        const v2z = sample.point3.z - sample.point2.z;

        // Dot product
        const dot = v1x * v2x + v1y * v2y + v1z * v2z;

        // Vector magnitudes
        const mag1 = Math.hypot(v1x, v1y, v1z);
        const mag2 = Math.hypot(v2x, v2y, v2z);

        // Avoid division by zero
        if (mag1 === 0 || mag2 === 0) return 0;

        // Clamp for numerical stability
        const cosTheta = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));

        // Angle in radians, substracted to PI to get the internal angle of the joint bending
        return Math.PI - Math.acos(cosTheta);
    };

    useEffect(() => {
        let cancelled = false;
        let frameRequest = 0;
        let lastFrameTime = -1;
        // Running the model on every camera frame pegs the CPU on machines without a GPU,
        // and results beyond UPDATE_HZ_S were discarded anyway.
        const minSendIntervalMs = 1000 / UPDATE_HZ_S;
        let lastSendTime = -Infinity;
        let pendingSend: Promise<void> = Promise.resolve();

        const hands = new Hands({
            locateFile: (file) => `${MEDIAPIPE_HANDS_URL}${file}`,
        });
        handsRef.current = hands;
        hands.setOptions({
            ...HANDS_MODEL_CONFIG,
            maxNumHands: maxNumHandsFor(controlModeRef.current),
        });
        hands.onResults(onResults);

        const pump = () => {
            if (cancelled) { return; }

            const video = webcamRef.current?.video;
            const now = performance.now();
            const hasNewFrame =
                video &&
                video.readyState === 4 &&
                !video.paused &&
                video.currentTime !== lastFrameTime;

            if (!hasNewFrame || now - lastSendTime < minSendIntervalMs) {
                frameRequest = requestAnimationFrame(pump);
                return;
            }

            lastSendTime = now;
            lastFrameTime = video.currentTime;
            pendingSend = hands.send({ image: video }).catch(() => undefined);
            pendingSend.then(() => {
                if (!cancelled) { frameRequest = requestAnimationFrame(pump); }
            });
        };

        frameRequest = requestAnimationFrame(pump);

        return () => {
            cancelled = true;
            cancelAnimationFrame(frameRequest);
            handsRef.current = null;
            // Let any in-flight send() settle before tearing down the WASM module.
            pendingSend.then(() => hands.close()).catch(() => undefined);
        };

    }, []);

    // A robot package swap changes how many hands the tracker needs.
    useEffect(() => {
        handsRef.current?.setOptions({
            ...HANDS_MODEL_CONFIG,
            maxNumHands: maxNumHandsFor(controlMode),
        });
    }, [controlMode]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={true}
                videoConstraints={videoConstraints}
                onUserMedia={(m) => { console.log(m) }}
                onUserMediaError={(e) => { console.error(e) }}
                style={{
                    position: "absolute",
                    inset: 0,
                    textAlign: "center",
                    zIndex: 0,
                    width: width ?? "100%",
                    height: height ?? "100%",
                    objectFit: "contain",
                }}
            />

            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    textAlign: "center",
                    zIndex: 1,
                    width: width ?? "100%",
                    height: height ?? "100%",
                    objectFit: "contain",
                }}
            />
        </div>
    )
}

export default MediapipeHandTracker;

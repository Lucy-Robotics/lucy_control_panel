/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Results, Landmark, Handedness } from "@mediapipe/hands";
import React, { useEffect, useMemo, useRef } from "react";
import Webcam from "react-webcam";
import { drawConnectors, drawLandmarks, HAND_CONNECTIONS, Hands } from "../Utils/mediapipe";
import { ControlMode, controlModeForRobotPackage, HANDS_MODEL_CONFIG, MEDIAPIPE_HANDS_URL } from "../Constants/MediaPipe";
import { useActiveHardwareRos } from "../contexts/ActiveHardwareRosContext";
import { clawOpenness, fingerFlex, thumbFlex, type FingerPoints } from "../Utils/handFlex";
import { oneEuroFilter, type OneEuroFilter } from "../Utils/oneEuroFilter";

const UPDATE_HZ_S = 5;

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
    type Finger3DIndex = { TIP: number, DIP: number, PIP: number, MCP: number }
    // i1 (inmoov_urdf) and i2 (inmoov_i2_urdf) joint per finger; only the loaded robot has one, the other is a no-op.
    type FingerIndex = { names: string[], idx: Finger3DIndex, flex: (finger: FingerPoints) => number }

    const Fingers: Array<FingerIndex> = [
        {
            names: ["i01.side.thumb_link_joint", "i02_side_ThumbMid_joint"], flex: thumbFlex, idx: {
                TIP: 4,
                DIP: 3,
                PIP: 2,
                MCP: 1
            }
        },
        {
            names: ["i01.side.index_link_joint", "i02_side_indexPhal_joint"], flex: fingerFlex, idx: {
                TIP: 8,
                DIP: 7,
                PIP: 6,
                MCP: 5
            }
        },
        {
            names: ["i01.side.majeure_link_joint", "i02_side_majeurePhal_joint"], flex: fingerFlex, idx: {
                TIP: 12,
                DIP: 11,
                PIP: 10,
                MCP: 9
            }
        },
        {
            names: ["i01.side.ringFinger_link_joint", "i02_side_ringFingerPhal_joint"], flex: fingerFlex, idx: {
                TIP: 16,
                DIP: 15,
                PIP: 14,
                MCP: 13
            }
        },
        {
            names: ["i01.side.pinky_link_joint", "i02_side_pinkyPhal_joint"], flex: fingerFlex, idx: {
                TIP: 20,
                DIP: 19,
                PIP: 18,
                MCP: 17
            }
        },
    ]

    const videoConstraints = useMemo(
        () => (width || height ? { width, height } : undefined),
        [width, height]
    );

    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastProcessTimeRef = useRef<number>(0);
    const filtersRef = useRef(new Map<string, OneEuroFilter>());
    const reportedRatioRef = useRef<number | null>(null);
    const aspectRatioCallbackRef = useRef(onAspectRatioChange);
    aspectRatioCallbackRef.current = onAspectRatioChange;
    const handsRef = useRef<InstanceType<typeof Hands> | null>(null);

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
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        if (videoWidth && videoHeight) {
            const ratio = videoWidth / videoHeight;
            if (reportedRatioRef.current !== ratio) {
                reportedRatioRef.current = ratio;
                aspectRatioCallbackRef.current?.(ratio);
            }
        }

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

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
        const now = Date.now();
        const sendDue = now - lastProcessTimeRef.current >= 1000 / UPDATE_HZ_S;
        if (sendDue) lastProcessTimeRef.current = now;
        processHands(results.multiHandWorldLandmarks, results.multiHandedness, now, sendDue);

        ctx.restore();
    };

    function smoothed(key: string, value: number, now: number): number {
        const filters = filtersRef.current;
        const filter = filters.get(key) ?? oneEuroFilter();
        filters.set(key, filter);
        return filter(value, now);
    }

    function processHands(hands: Landmark[][], handedness: Handedness[], now: number, sendDue: boolean) {
        hands.forEach((hand, handIndex) => {
            if (controlModeRef.current === ControlMode.Claw) {
                const openness = smoothed("claw", clawOpenness(hand), now);
                if (sendDue) moveRobotIndex(openness, "Jaw");
                return;
            }

            const label = handedness[handIndex].label === "Left" ? "leftHand" : "rightHand";
            Fingers.forEach(({ names, idx, flex }) => {
                const value = smoothed(`${label}:${idx.TIP}`, flex({
                    tip: hand[idx.TIP],
                    dip: hand[idx.DIP],
                    pip: hand[idx.PIP],
                    mcp: hand[idx.MCP],
                    wrist: hand[0],
                }), now);
                if (sendDue) names.forEach((name) => moveRobotIndex(value, name.replace("side", label)));
            });
        });
    };

    useEffect(() => {
        let cancelled = false;
        let frameRequest = 0;
        let lastFrameTime = -1;
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
            const hasNewFrame =
                video &&
                video.readyState === 4 &&
                !video.paused &&
                video.currentTime !== lastFrameTime;

            if (!hasNewFrame) {
                frameRequest = requestAnimationFrame(pump);
                return;
            }

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

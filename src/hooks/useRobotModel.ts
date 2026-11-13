/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Loads the robot model via urdf-loader (full FK, DAE/STL/OBJ loading, visual origins
 * and joint transforms).
 *
 * The URDF XML comes from the latched `/robot_description` topic
 * (RobotDescriptionHandler); each `<mesh>` comes as a cached GLB from the
 * panel's own `/meshes` route, loaded in a custom `loadMeshCb`.
 *
 * Module-level cache: once loaded in a browser session, subsequent mounts
 * (e.g. closing/reopening the stream modal) reuse the parsed data instantly.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { isWebGLAvailable } from 'three-stdlib';
import URDFLoader from 'urdf-loader';
import type { URDFRobot } from 'urdf-loader';
import { RobotDescriptionHandler } from '../Services/ros/handlers/RobotDescription.handler';
import { fetchMeshGlb, parseMeshGlb } from '../Services/meshes/loadMeshGlb';
import { runWithConcurrency } from '../Utils/concurrency.utils';
import { formatCaughtError } from '../Utils/error.utils';

/** How long to wait for `/robot_description` before surfacing a hint to the user. */
const ROBOT_DESCRIPTION_TIMEOUT_MS = 20000;
const MESH_FETCH_CONCURRENCY = 6;

// ---------------------------------------------------------------------------
// Module-level cache — shared across all component instances in a session.
// Keyed by the URDF source so a republished model triggers a reload.
// ---------------------------------------------------------------------------
type GlobalCache =
    | { ready: false }
    | { ready: true; urdf: string; robot: URDFRobot };

let globalCache: GlobalCache = { ready: false };

function disposeRobot(robot: URDFRobot): void {
    robot.traverse((o) => {
        if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Points)) return;
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
            m.dispose();
        }
    });
}

export function forgetRobotModel(): void {
    globalCache = { ready: false };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseRobotModelReturn {
    robot: URDFRobot | null;
    loading: boolean;
    loadingStatus: string;
    /** Mesh-load progress in [0, 1]; 0 until the first mesh is queued. */
    progress: number;
    error: string | null;
    reload: () => void;
}

export function useRobotModel(): UseRobotModelReturn {
    const [robot, setRobot] = useState<URDFRobot | null>(
        globalCache.ready ? globalCache.robot : null,
    );
    const [loading, setLoading] = useState(!globalCache.ready);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // The URDF string most recently parsed — guards against re-parsing the same
    // model when the latched topic re-delivers it (e.g. after a reconnect).
    const loadedUrdfRef = useRef<string | null>(globalCache.ready ? globalCache.urdf : null);
    // Bumped by reload() to force a fresh subscription + parse.
    const [reloadToken, setReloadToken] = useState(0);
    const runRef = useRef(0);
    const robotRef = useRef<URDFRobot | null>(robot);

    const showRobot = useCallback((next: URDFRobot | null) => {
        const previous = robotRef.current;
        robotRef.current = next;
        setRobot(next);
        if (previous && previous !== next) {
            if (globalCache.ready && globalCache.robot === previous) globalCache = { ready: false };
            disposeRobot(previous);
        }
    }, []);

    const parseAndLoad = useCallback(async (urdf: string) => {
        const run = ++runRef.current;
        const stale = () => runRef.current !== run;
        if (!isWebGLAvailable()) {
            setError('WebGL is not supported in this browser.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setProgress(0);
            setError(null);
            setLoadingStatus('Parsing URDF model…');

            // urdf-loader calls loadMeshCb synchronously per <mesh> during parse()
            // and wires the result into the scene graph when `done` fires. We fetch
            // each mesh over the ROS service, so the fetches are queued here and run
            // pooled after parse() returns.
            const glbCache = new Map<string, Promise<ArrayBuffer>>();
            const tasks: Array<() => Promise<void>> = [];
            let total = 0;
            let completed = 0;
            let failed = 0;
            let lastError = '';

            const loader = new URDFLoader();
            loader.loadMeshCb = (path, _manager, done) => {
                tasks.push(async () => {
                    if (stale()) return;
                    try {
                        let glb = glbCache.get(path);
                        if (!glb) {
                            glb = fetchMeshGlb(path);
                            glbCache.set(path, glb);
                        }
                        done(await parseMeshGlb(await glb));
                    } catch (e) {
                        failed++;
                        lastError = formatCaughtError(e);
                        // urdf-loader skips the mesh when an error is passed; the
                        // typings require an Object3D, so cast the unused null.
                        done(null as unknown as Parameters<typeof done>[0], e instanceof Error ? e : new Error(lastError));
                    } finally {
                        completed++;
                        if (!stale()) {
                            if (total > 0) setProgress(Math.min(0.99, completed / total));
                            setLoadingStatus(`Loading meshes (${completed}/${total})…`);
                        }
                    }
                });
            };
            const loadedRobot = loader.parse(urdf);
            total = tasks.length;

            // Reveal the model now so its meshes stream into the live scene as
            // they arrive — the robot is a shared scene graph that keeps mutating
            // while meshes load. Mark this URDF as in-flight to block a duplicate
            // parse if the latched topic re-delivers it mid-load.
            loadedUrdfRef.current = urdf;
            showRobot(loadedRobot);

            setLoadingStatus(`Loading meshes (0/${total})…`);
            await runWithConcurrency(tasks.slice(0, 1), 1);
            await runWithConcurrency(tasks.slice(1), MESH_FETCH_CONCURRENCY);
            if (stale()) return;

            if (total > 0 && failed === total) {
                throw new Error(
                    `Could not load any meshes (${lastError}).\n` +
                    'Is the control panel served by its own vite server (yarn dev)?\n' +
                    'Restart the stack and refresh the control panel.',
                );
            }

            // Commit to the session cache only once every mesh loaded, so a partial
            // load is retried by the next mount instead of keeping its holes.
            if (failed === 0) {
                globalCache = { ready: true, urdf, robot: loadedRobot };
            } else {
                console.warn(
                    `[useRobotModel] ${failed} mesh(es) failed to load ` +
                    `(${lastError || 'see above'}); the model will reload on the next open`,
                );
            }

            const linkCount = Object.keys(loadedRobot.links).length;
            const jointCount = Object.keys(loadedRobot.joints).length;
            const actuated = Object.values(loadedRobot.joints).filter(
                j => j.jointType === 'revolute' || j.jointType === 'continuous',
            ).length;
            console.debug(
                `[useRobotModel] Done — ${linkCount} links, ${jointCount} joints ` +
                `(${actuated} actuated), ${total - failed}/${total} meshes`,
            );
            setLoadingStatus('Done');
            setProgress(1);
            setLoading(false);

        } catch (err) {
            if (stale()) return;
            // Clear the in-flight guard so a retry (or topic re-delivery) re-parses.
            loadedUrdfRef.current = null;
            setError(err instanceof Error ? err.message : 'Failed to load robot model');
            setLoading(false);
        }
    }, [showRobot]);

    useEffect(() => {
        let cancelled = false;

        // If nothing arrives in time, the robot description topic is probably
        // not being published — surface an actionable hint instead of spinning.
        const timeout = window.setTimeout(() => {
            if (cancelled || globalCache.ready) return;
            setError(
                'No URDF received on /robot_description.\n' +
                'Connect to the ROS bridge and make sure robot_state_publisher is running\n' +
                '(e.g. the Lucy bringup launch).',
            );
            setLoading(false);
        }, ROBOT_DESCRIPTION_TIMEOUT_MS);

        const unsubscribe = RobotDescriptionHandler.getInstance().subscribe((urdf) => {
            if (cancelled) return;
            if (!urdf) {
                // Disconnected / not published yet. Keep any cached model on
                // screen; otherwise show the waiting state.
                if (!globalCache.ready) {
                    setLoading(true);
                    setLoadingStatus('Waiting for robot description from ROS…');
                }
                return;
            }
            window.clearTimeout(timeout);
            if (urdf === loadedUrdfRef.current) return; // already parsed this model
            void parseAndLoad(urdf);
        });

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
            unsubscribe();
        };
    }, [parseAndLoad, reloadToken]);

    const reload = useCallback(() => {
        // Re-running the hook alone would not touch the rosbridge subscription.
        RobotDescriptionHandler.getInstance().resubscribe();
        globalCache = { ready: false };
        loadedUrdfRef.current = null;
        runRef.current++;
        showRobot(null);
        setLoading(true);
        setProgress(0);
        setError(null);
        setLoadingStatus('');
        setReloadToken(t => t + 1);
    }, [showRobot]);

    return { robot, loading, loadingStatus, progress, error, reload };
}

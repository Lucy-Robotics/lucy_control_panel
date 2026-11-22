/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';
import type { MeshQuality } from '../../../Constants/meshQuality.ts';

/**
 * Fetches a mesh referenced by the URDF over the `mesh/get` service on the
 * `lucy_config_services` node.
 *
 * Encodings (see lucy_msgs/srv/GetMesh.srv):
 *   utf8        — Collada/DAE, OBJ and MTL text
 *   zlib_base64 — zlib-compressed binary (STL), then base64
 *   glb_base64  : meshopt GLB at the requested quality, then base64
 */
const MESH_SERVICE_NAME = '/mesh/get';
const MESH_SERVICE_TYPE = 'lucy_msgs/srv/GetMesh';
/** Client-side wait; must stay ≥ rosbridge `default_call_service_timeout`. */
const MESH_SERVICE_TIMEOUT_MS = 60_000;
/** Passed to rosbridge per attempt: a reply lost in DDS is retried after 3 s, then slow servers get 10 s. */
const MESH_SERVICE_ROSBRIDGE_TIMEOUTS_S = [3.0, 10.0, 10.0];

export type MeshEncoding = 'utf8' | 'zlib_base64' | string;

export type MeshPayload = {
    data: string;
    encoding: MeshEncoding;
    /** Raw GLB bytes when fetched over HTTP (no base64). */
    bytes?: ArrayBuffer;
};

type BatchEntry = MeshPayload & { success: boolean; message: string };

/** TEMP (tmp/mesh-load-bench): `?meshes=ros|batch|http` picks how meshes are fetched. */
export const MESH_TRANSPORT = new URLSearchParams(window.location.search).get('meshes') ?? 'ros';

/** roslib's public types omit EventEmitter helpers used for service calls. */
type RosWithEmitter = ROSLIB.Ros & {
    idCounter: number;
    once(event: string, listener: (message: RosServiceResponseMessage) => void): void;
    off(event: string, listener?: (message: RosServiceResponseMessage) => void): void;
    callOnConnection(message: Record<string, unknown>): void;
};

type RosServiceResponseMessage = {
    result?: boolean;
    values?: {
        success?: boolean;
        message?: string;
        data?: string;
        encoding?: string;
    } | string;
};

/** Turn rosbridge failedCallback payloads (string | object) into readable text. */
function formatRosServiceError(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

/** Infer encoding for older servers that omit the field. */
function inferEncoding(path: string, encoding: string | undefined): MeshEncoding {
    if (encoding && encoding.trim()) return encoding.trim();
    return path.toLowerCase().endsWith('.stl') ? 'zlib_base64' : 'utf8';
}

const SERVER_WITHOUT_QUALITY = /does not have a field quality/;

export class MeshHandler {
    private static serverTakesQuality = true;

    /** Resolve to mesh payload (data + encoding), or reject on failure/timeout. */
    static async getMesh(path: string, quality?: MeshQuality): Promise<MeshPayload> {
        for (let attempt = 1; ; attempt++) {
            try {
                return await MeshHandler.request(path, MeshHandler.serverTakesQuality ? quality : undefined, attempt);
            } catch (e) {
                if (quality && MeshHandler.serverTakesQuality && SERVER_WITHOUT_QUALITY.test(String(e))) {
                    MeshHandler.serverTakesQuality = false;
                    continue;
                }
                if (attempt >= MESH_SERVICE_ROSBRIDGE_TIMEOUTS_S.length) throw e;
            }
        }
    }

    /** TEMP: the committed GLB as a cached static file; falls back to mesh/get when none. */
    static async getMeshHttp(path: string, quality: MeshQuality): Promise<MeshPayload> {
        const response = await fetch(`/mesh-files${path.replace(/^file:\/\//, '')}.${quality}.glb`);
        if (!response.ok) return MeshHandler.getMesh(path, quality);
        return { data: '', encoding: 'glb_base64', bytes: await response.arrayBuffer() };
    }

    /** TEMP: every mesh in one mesh/get call (JSON list in `path`). */
    static async getMeshBatch(paths: string[], quality: MeshQuality): Promise<Record<string, BatchEntry>> {
        const payload = await MeshHandler.request(JSON.stringify(paths), quality, MESH_SERVICE_ROSBRIDGE_TIMEOUTS_S.length);
        return JSON.parse(payload.data) as Record<string, BatchEntry>;
    }

    private static request(path: string, quality: MeshQuality | undefined, attempt: number): Promise<MeshPayload> {
        const ros = RosBridgeService.getInstance().rosConnection as RosWithEmitter | null;
        if (!ros) return Promise.reject(new Error('ROS bridge is not connected.'));

        // Build the call ourselves so we can set rosbridge `timeout` — roslib's
        // Service.callService does not expose that field.
        const callId = `call_service:${MESH_SERVICE_NAME}:${++ros.idCounter}`;

        return new Promise<MeshPayload>((resolve, reject) => {
            const onResponse = (message: RosServiceResponseMessage) => {
                window.clearTimeout(timer);
                if (message.result === false) {
                    reject(new Error(
                        `${formatRosServiceError(message.values)} (${path})`,
                    ));
                    return;
                }
                const values = message.values;
                if (values && typeof values === 'object' && values.success && typeof values.data === 'string') {
                    resolve({
                        data: values.data,
                        encoding: inferEncoding(path, values.encoding),
                    });
                    return;
                }
                const detail = values && typeof values === 'object'
                    ? (values.message || formatRosServiceError(values))
                    : formatRosServiceError(values);
                reject(new Error(detail || `${MESH_SERVICE_NAME} failed for ${path}`));
            };

            const timer = window.setTimeout(
                () => {
                    ros.off(callId, onResponse);
                    reject(new Error(`${MESH_SERVICE_NAME} timed out for ${path}`));
                },
                MESH_SERVICE_TIMEOUT_MS,
            );

            ros.once(callId, onResponse);

            ros.callOnConnection({
                op: 'call_service',
                id: callId,
                service: MESH_SERVICE_NAME,
                type: MESH_SERVICE_TYPE,
                args: quality ? { path, quality } : { path },
                timeout: MESH_SERVICE_ROSBRIDGE_TIMEOUTS_S[attempt - 1],
            });
        });
    }
}

/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

class BlobReader {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;

    readAsArrayBuffer(blob: Blob): void {
        void blob.arrayBuffer().then((buffer) => {
            this.result = buffer;
            this.onloadend?.();
        });
    }
}

export async function provideDomForLoaders(): Promise<void> {
    if (globalThis.DOMParser) return;
    const { JSDOM } = await import('jsdom');
    Object.assign(globalThis, { DOMParser: new JSDOM('').window.DOMParser, FileReader: BlobReader });
}

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ViteDevServer } from 'vite';
import { calibrationModule } from './calibrationUiHarness.ts';

export async function loadWizardRenderer(server: ViteDevServer) {
    const model = await server.ssrLoadModule(calibrationModule('calibrationModel.ts'));
    const { CalibrationWizard } = await server.ssrLoadModule(calibrationModule('CalibrationWizard.tsx'));

    function makeSession(status: unknown, overrides: Record<string, unknown> = {}) {
        return {
            status,
            supported: true,
            busy: false,
            error: null,
            activated: false,
            activation: '',
            send: async () => true,
            activate: async () => true,
            resetActivation: () => {},
            ...overrides,
        };
    }

    function renderWizard(status: unknown, overrides: Record<string, unknown> = {}): string {
        const session = makeSession(status, overrides);
        return renderToStaticMarkup(React.createElement(CalibrationWizard, { session }));
    }

    return { emptyStatus: model.EMPTY_STATUS, renderWizard };
}

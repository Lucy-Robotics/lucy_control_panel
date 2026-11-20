import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, '..');
const calibrationDir = '/src/features/hardwareConfiguration/calibration';

export const calibrationModule = (file: string): string => `${calibrationDir}/${file}`;

export function startUiServer(): Promise<ViteDevServer> {
    return createServer({
        server: { middlewareMode: true },
        root: projectRoot,
        configFile: path.join(projectRoot, 'vite.config.ts'),
        optimizeDeps: { noDiscovery: true, entries: [] },
        resolve: {
            alias: [
                { find: './CalibrationRobotPreview.tsx', replacement: path.join(here, 'stubs/CalibrationRobotPreviewStub.tsx') },
                { find: 'react-router-dom', replacement: path.join(here, 'stubs/reactRouterDomStub.ts') },
                { find: '@ant-design/icons', replacement: path.join(here, 'stubs/antIconsStub.tsx') },
                { find: 'antd', replacement: path.join(here, 'stubs/antdStub.tsx') },
            ],
        },
    });
}

/** Install only after the modules are loaded: three-fiber runs browser-only code once a window exists. */
export function installBrowserShim(): void {
    globalThis.window ??= {
        location: { protocol: 'http:', host: 'localhost' },
        addEventListener: () => {},
        removeEventListener: () => {},
    } as unknown as Window;
    globalThis.localStorage ??= {
        getItem: () => null,
        setItem: () => {},
    } as unknown as Storage;
}

export function printBanner(title: string): void {
    console.log('================================================================');
    console.log(title);
    console.log('================================================================\n');
}

export function printSection(title: string): void {
    console.log(`\n[${title}]`);
    console.log('----------------------------------------------------------------');
}

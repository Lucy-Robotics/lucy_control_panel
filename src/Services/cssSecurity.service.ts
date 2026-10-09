/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ThreatCategory =
    | 'xss'
    | 'ssrf'
    | 'breakout'
    | 'exfiltration'
    | 'remote_code'
    | 'untrusted_resource'
    | 'dos';

export interface CssViolation {
    ruleId: string;
    severity: ThreatSeverity;
    category: ThreatCategory;
    description: string;
    matchedSnippet?: string;
    line?: number;
}

export interface CssSecurityInspectionResult {
    isSafe: boolean;
    threatLevel: 'safe' | 'low_risk' | 'high_risk' | 'critical';
    violations: CssViolation[];
    sanitizedCss: string;
    metadata: {
        cssSizeBytes: number;
        rulesEvaluated: number;
        scannedAt: string;
        containsModifications: boolean;
    };
}

export interface SecurityPolicyOptions {
    allowPrivateIps?: boolean;
    allowExternalImports?: boolean;
    maxSizeBytes?: number;
    timeoutMs?: number;
    strictMode?: boolean;
}

export interface FetchCssResult {
    originalCss: string;
    sanitizedCss: string;
    inspection: CssSecurityInspectionResult;
    url: string;
    contentLength: number;
    contentType: string;
}

export interface SecurityAuditRecord {
    id: string;
    timestamp: number;
    source: string;
    isSafe: boolean;
    threatLevel: string;
    violationCount: number;
    violationsSummary: string[];
}

export class SecurityInspectionError extends Error {
    public readonly violations: CssViolation[];
    public readonly threatLevel: string;

    constructor(message: string, violations: CssViolation[], threatLevel: string) {
        super(message);
        this.name = 'SecurityInspectionError';
        this.violations = violations;
        this.threatLevel = threatLevel;
    }
}

export class CssSecurityService {
    private static _instance: CssSecurityService | null = null;

    private readonly defaultPolicy: Required<SecurityPolicyOptions> = {
        allowPrivateIps: false,
        allowExternalImports: false,
        maxSizeBytes: 512 * 1024,
        timeoutMs: 8000,
        strictMode: true,
    };

    private auditHistory: SecurityAuditRecord[] = [];
    private readonly MAX_AUDIT_RECORDS = 50;

    private constructor() { }

    public static getInstance(): CssSecurityService {
        if (!CssSecurityService._instance) {
            CssSecurityService._instance = new CssSecurityService();
        }
        return CssSecurityService._instance;
    }

    public validateUrl(url: string, customPolicy?: SecurityPolicyOptions): { isValid: boolean; error?: string } {
        const policy = { ...this.defaultPolicy, ...customPolicy };
        const trimmed = url.trim();

        if (!trimmed) {
            return { isValid: false, error: 'URL cannot be empty' };
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(trimmed);
        } catch {
            return { isValid: false, error: 'Malformed or invalid URL syntax' };
        }

        const allowedProtocols = ['http:', 'https:'];
        if (!allowedProtocols.includes(parsedUrl.protocol)) {
            return {
                isValid: false,
                error: `Dangerous or unsupported protocol: "${parsedUrl.protocol}". Only HTTP and HTTPS are permitted.`,
            };
        }

        if (!policy.allowPrivateIps) {
            const host = parsedUrl.hostname.toLowerCase();

            if (
                host === 'localhost' ||
                host === '127.0.0.1' ||
                host === '0.0.0.0' ||
                host === '::1' ||
                host === '[::1]' ||
                host.endsWith('.localhost') ||
                host.endsWith('.local') ||
                host.endsWith('.internal') ||
                host.endsWith('.lan')
            ) {
                return {
                    isValid: false,
                    error: `Access to local/loopback address "${host}" is blocked by security policy (SSRF protection).`,
                };
            }

            if (this.isPrivateOrReservedIpv4(host)) {
                return {
                    isValid: false,
                    error: `Access to private network or cloud metadata IP "${host}" is blocked by security policy.`,
                };
            }

            const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (parsedUrl.protocol === 'https:' ? 443 : 80);
            const blockedPorts = [22, 25, 110, 143, 9090, 11311];
            if (blockedPorts.includes(port)) {
                return {
                    isValid: false,
                    error: `Connection to sensitive internal port ${port} is blocked by security policy.`,
                };
            }
        }

        return { isValid: true };
    }

    private isPrivateOrReservedIpv4(host: string): boolean {
        const cleanHost = host.replace(/^\[|\]$/g, '');

        const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const match = ipRegex.exec(cleanHost);

        if (!match) {
            if (/^\d{8,11}$/.test(cleanHost)) {
                return true; // Reject numeric IP obfuscation
            }
            return false;
        }

        const octet1 = parseInt(match[1], 10);
        const octet2 = parseInt(match[2], 10);
        const octet3 = parseInt(match[3], 10);
        const octet4 = parseInt(match[4], 10);

        if (octet1 > 255 || octet2 > 255 || octet3 > 255 || octet4 > 255) {
            return true; // Invalid or malformed IP
        }

        // 127.0.0.0/8 (Loopback)
        if (octet1 === 127) return true;
        // 0.0.0.0/8 (Current network)
        if (octet1 === 0) return true;
        // 10.0.0.0/8 (RFC 1918 Private)
        if (octet1 === 10) return true;
        // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
        if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
        // 192.168.0.0/16 (RFC 1918 Private)
        if (octet1 === 192 && octet2 === 168) return true;
        // 169.254.0.0/16 (Link Local & AWS/Azure/GCP metadata 169.254.169.254)
        if (octet1 === 169 && octet2 === 254) return true;
        // 100.64.0.0/10 (Carrier-grade NAT)
        if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return true;
        // 224.0.0.0/4 (Multicast / Reserved)
        if (octet1 >= 224) return true;

        return false;
    }

    public normalizeCssForAnalysis(css: string): string {
        let normalized = css;

        normalized = normalized.replace(/\0/g, '');

        normalized = normalized.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => {
            const codePoint = parseInt(hex, 16);
            if (codePoint >= 32 && codePoint <= 126) {
                return String.fromCharCode(codePoint);
            }
            return '';
        });

        normalized = normalized.replace(/\\([a-zA-Z])/g, '$1');

        normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');

        return normalized;
    }

    public inspectCss(css: string, customPolicy?: SecurityPolicyOptions): CssSecurityInspectionResult {
        const policy = { ...this.defaultPolicy, ...customPolicy };
        const violations: CssViolation[] = [];
        let rulesEvaluated = 0;

        const cssSizeBytes = new Blob([css]).size;

        rulesEvaluated++;
        if (cssSizeBytes > policy.maxSizeBytes) {
            violations.push({
                ruleId: 'dos-size-exceeded',
                severity: 'critical',
                category: 'dos',
                description: `Stylesheet size (${Math.round(cssSizeBytes / 1024)} KB) exceeds the maximum allowed limit of ${Math.round(policy.maxSizeBytes / 1024)} KB.`,
            });
        }

        const normalized = this.normalizeCssForAnalysis(css);
        const lowerRaw = css.toLowerCase();
        const lowerNorm = normalized.toLowerCase();

        rulesEvaluated++;
        const htmlBreakoutRegex = /<\s*\/?\s*(style|script|iframe|object|embed|svg|link|meta|img|form|base|body|html)[\s/>]/i;
        if (htmlBreakoutRegex.test(css) || htmlBreakoutRegex.test(normalized)) {
            const match = css.match(htmlBreakoutRegex) || normalized.match(htmlBreakoutRegex);
            violations.push({
                ruleId: 'breakout-html-tag',
                severity: 'critical',
                category: 'breakout',
                description: 'Detected HTML tag breakout sequence which can close the stylesheet and execute arbitrary script.',
                matchedSnippet: match ? match[0] : undefined,
            });
        }

        rulesEvaluated++;
        if (/<\s*!--/i.test(css) || /-->/i.test(css) || /<!\[cdata\[/i.test(css)) {
            violations.push({
                ruleId: 'breakout-comment-cdata',
                severity: 'high',
                category: 'breakout',
                description: 'Detected HTML comment or CDATA tags embedded inside stylesheet text.',
                matchedSnippet: 'HTML comment / CDATA sequence',
            });
        }

        if (/\bon(?:error|load|click|mouseover|focus)\s*=/i.test(normalized)) {
            violations.push({
                ruleId: 'breakout-event-handler',
                severity: 'critical',
                category: 'xss',
                description: 'Detected inline HTML event handler attribute inside stylesheet.',
            });
        }

        rulesEvaluated++;
        const scriptProtoRegex = /(?:javascript|vbscript|livescript)\s*:/i;
        if (scriptProtoRegex.test(lowerNorm) || scriptProtoRegex.test(lowerRaw)) {
            const snippet = this.extractSnippet(normalized, scriptProtoRegex);
            violations.push({
                ruleId: 'xss-script-protocol',
                severity: 'critical',
                category: 'xss',
                description: 'Detected dangerous javascript: or vbscript: executable pseudo-protocol in CSS.',
                matchedSnippet: snippet,
            });
        }

        rulesEvaluated++;
        const expressionRegex = /\bexpression\s*\(/i;
        if (expressionRegex.test(lowerNorm) || expressionRegex.test(lowerRaw)) {
            const snippet = this.extractSnippet(normalized, expressionRegex);
            violations.push({
                ruleId: 'xss-dynamic-expression',
                severity: 'critical',
                category: 'remote_code',
                description: 'Detected CSS dynamic expression() invocation that executes arbitrary script code.',
                matchedSnippet: snippet,
            });
        }

        rulesEvaluated++;
        const behaviorRegex = /\b(?:behavior|-moz-binding)\s*:\s*url\s*\(/i;
        if (behaviorRegex.test(lowerNorm) || behaviorRegex.test(lowerRaw)) {
            const snippet = this.extractSnippet(normalized, behaviorRegex);
            violations.push({
                ruleId: 'remote-behavior-binding',
                severity: 'critical',
                category: 'remote_code',
                description: 'Detected dangerous behavior or -moz-binding directive designed to attach script components.',
                matchedSnippet: snippet,
            });
        }

        rulesEvaluated++;
        const dangerousDataUriRegex = /data:\s*(?:text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/javascript|application\/javascript|text\/xml|application\/xml)/i;
        if (dangerousDataUriRegex.test(lowerNorm) || dangerousDataUriRegex.test(lowerRaw)) {
            const snippet = this.extractSnippet(normalized, dangerousDataUriRegex);
            violations.push({
                ruleId: 'xss-dangerous-data-uri',
                severity: 'high',
                category: 'xss',
                description: 'Detected dangerous data: URI with scriptable MIME type (HTML, SVG, or JavaScript).',
                matchedSnippet: snippet,
            });
        }

        rulesEvaluated++;
        const exfiltrationRegex = /(?:input|form|textarea|select|\[[^\]]*(?:value|password|token|secret|key|auth|session|credential)[^\]]*\])[^{]*\{[^}]*url\s*\(/i;
        if (exfiltrationRegex.test(lowerNorm) || exfiltrationRegex.test(lowerRaw)) {
            const snippet = this.extractSnippet(normalized, exfiltrationRegex);
            violations.push({
                ruleId: 'exfiltration-keylogger-selector',
                severity: 'high',
                category: 'exfiltration',
                description: 'Detected CSS keylogger / attribute exfiltration attack targeting form inputs or credentials with remote background URLs.',
                matchedSnippet: snippet,
            });
        }

        rulesEvaluated++;
        const importRegex = /@import\s+(?:url\s*\(['"]?([^'")]+)['"]?\)|['"]([^'"]+)['"])/i;
        if (importRegex.test(lowerNorm) || importRegex.test(lowerRaw)) {
            if (!policy.allowExternalImports) {
                const snippet = this.extractSnippet(normalized, importRegex);
                violations.push({
                    ruleId: 'untrusted-import-rule',
                    severity: 'high',
                    category: 'untrusted_resource',
                    description: 'External @import directives are forbidden by security policy to prevent chained remote injection or bypasses.',
                    matchedSnippet: snippet,
                });
            }
        }

        rulesEvaluated++;
        const overlayRegex = /position\s*:\s*fixed\b[^}]*z-index\s*:\s*(?:9{4,}|2147483647)[^}]*opacity\s*:\s*0\b/i;
        if (overlayRegex.test(lowerNorm)) {
            violations.push({
                ruleId: 'redress-invisible-overlay',
                severity: 'medium',
                category: 'exfiltration',
                description: 'Detected suspicious full-screen invisible fixed overlay pattern (potential clickjacking / UI redressing).',
            });
        }

        const hasCritical = violations.some(v => v.severity === 'critical');
        const hasHigh = violations.some(v => v.severity === 'high');
        const hasMedium = violations.some(v => v.severity === 'medium');

        let threatLevel: CssSecurityInspectionResult['threatLevel'] = 'safe';
        if (hasCritical) threatLevel = 'critical';
        else if (hasHigh) threatLevel = 'high_risk';
        else if (hasMedium) threatLevel = 'low_risk';

        const isSafe = violations.length === 0 || (!hasCritical && !hasHigh);

        const sanitized = this.sanitizeCss(css);
        const containsModifications = sanitized !== css;

        return {
            isSafe,
            threatLevel,
            violations,
            sanitizedCss: sanitized,
            metadata: {
                cssSizeBytes,
                rulesEvaluated,
                scannedAt: new Date().toISOString(),
                containsModifications,
            },
        };
    }

    public sanitizeCss(css: string): string {
        let cleaned = css;

        cleaned = cleaned.replace(/<\s*\/?\s*(style|script|iframe|object|embed|svg|link|meta|img|form|base|body|html)[\s/>][^>]*>?/gi, '/* [REMOVED_HTML_TAG] */');
        cleaned = cleaned.replace(/<\s*!--[\s\S]*?-->/g, '/* [REMOVED_HTML_COMMENT] */');
        cleaned = cleaned.replace(/<!\[cdata\[[\s\S]*?\]\]>/gi, '/* [REMOVED_CDATA] */');

        cleaned = cleaned.replace(/url\s*\(\s*["']?\s*(?:javascript|vbscript|livescript):[^)]*\)/gi, 'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") /* [BLOCKED_SCRIPT_URL] */');

        cleaned = cleaned.replace(/\bexpression\s*\([^)]*\)/gi, 'inherit /* [BLOCKED_EXPRESSION] */');

        cleaned = cleaned.replace(/\b(?:behavior|-moz-binding)\s*:[^;!}]+/gi, '/* [BLOCKED_BEHAVIOR] */');

        cleaned = cleaned.replace(/url\s*\(\s*["']?data:\s*(?:text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/javascript|application\/javascript)[^)]*\)/gi, 'url("") /* [BLOCKED_DANGEROUS_DATA_URI] */');

        cleaned = cleaned.replace(/@import\s+[^;]+;/gi, '/* [BLOCKED_REMOTE_IMPORT] */');

        cleaned = cleaned.replace(/(?:input|form|textarea|select|\[[^\]]*(?:value|password|token|secret|key|auth|session|credential)[^\]]*\])[^{]*\{[^}]*url\s*\([^)]*\)[^}]*\}/gi, '/* [BLOCKED_DATA_EXFILTRATION_RULE] */');

        return cleaned;
    }

    public async fetchCssWithSecurity(
        url: string,
        customPolicy?: SecurityPolicyOptions
    ): Promise<FetchCssResult> {
        const policy = { ...this.defaultPolicy, ...customPolicy };

        const urlValidation = this.validateUrl(url, policy);
        if (!urlValidation.isValid) {
            this.recordAudit(url, false, 'critical', [urlValidation.error || 'Invalid URL']);
            throw new SecurityInspectionError(
                urlValidation.error || 'Blocked by URL security validator',
                [
                    {
                        ruleId: 'ssrf-blocked',
                        severity: 'critical',
                        category: 'ssrf',
                        description: urlValidation.error || 'URL blocked by security validator',
                    },
                ],
                'critical'
            );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), policy.timeoutMs);

        let response: Response;
        try {
            response = await fetch(url.trim(), {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    Accept: 'text/css, text/plain;q=0.9, */*;q=0.1',
                },
            });
        } catch (fetchErr: unknown) {
            const errName = fetchErr instanceof Error ? fetchErr.name : '';
            if (errName === 'AbortError') {
                throw new Error(`Connection timed out after ${policy.timeoutMs / 1000} seconds fetching stylesheet.`);
            }
            const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            throw new Error(`Network error while fetching stylesheet: ${errMsg}`);
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            throw new Error(`Failed to load theme from URL (${response.status}: ${response.statusText})`);
        }

        const contentType = response.headers.get('content-type') || '';
        const lowerType = contentType.toLowerCase();
        if (
            lowerType.includes('text/html') ||
            lowerType.includes('application/javascript') ||
            lowerType.includes('image/svg+xml') ||
            lowerType.includes('application/octet-stream')
        ) {
            const violation: CssViolation = {
                ruleId: 'invalid-content-type',
                severity: 'critical',
                category: 'untrusted_resource',
                description: `Invalid Content-Type header "${contentType}". Expected text/css. Response may be an executable script or HTML page.`,
            };
            this.recordAudit(url, false, 'critical', [violation.description]);
            throw new SecurityInspectionError(violation.description, [violation], 'critical');
        }

        const contentLengthHeader = response.headers.get('content-length');
        if (contentLengthHeader) {
            const contentLength = parseInt(contentLengthHeader, 10);
            if (!isNaN(contentLength) && contentLength > policy.maxSizeBytes) {
                const violation: CssViolation = {
                    ruleId: 'dos-size-exceeded',
                    severity: 'critical',
                    category: 'dos',
                    description: `Declared Content-Length (${Math.round(contentLength / 1024)} KB) exceeds safety limit of ${Math.round(policy.maxSizeBytes / 1024)} KB.`,
                };
                this.recordAudit(url, false, 'critical', [violation.description]);
                throw new SecurityInspectionError(violation.description, [violation], 'critical');
            }
        }

        const rawCss = await response.text();
        const actualSizeBytes = new Blob([rawCss]).size;

        if (actualSizeBytes > policy.maxSizeBytes) {
            const violation: CssViolation = {
                ruleId: 'dos-size-exceeded',
                severity: 'critical',
                category: 'dos',
                description: `Stylesheet downloaded (${Math.round(actualSizeBytes / 1024)} KB) exceeds maximum allowed size of ${Math.round(policy.maxSizeBytes / 1024)} KB.`,
            };
            this.recordAudit(url, false, 'critical', [violation.description]);
            throw new SecurityInspectionError(violation.description, [violation], 'critical');
        }

        const inspection = this.inspectCss(rawCss, policy);

        this.recordAudit(
            url,
            inspection.isSafe,
            inspection.threatLevel,
            inspection.violations.map(v => v.description)
        );

        if (policy.strictMode && !inspection.isSafe) {
            const criticalOrHigh = inspection.violations.filter(
                v => v.severity === 'critical' || v.severity === 'high'
            );
            const summary = criticalOrHigh.map(v => `• [${v.severity.toUpperCase()}] ${v.description}`).join('\n');
            throw new SecurityInspectionError(
                `Stylesheet blocked due to dangerous injection / infection threats:\n${summary}`,
                inspection.violations,
                inspection.threatLevel
            );
        }

        return {
            originalCss: rawCss,
            sanitizedCss: inspection.sanitizedCss,
            inspection,
            url,
            contentLength: actualSizeBytes,
            contentType,
        };
    }

    private recordAudit(source: string, isSafe: boolean, threatLevel: string, violationsSummary: string[]): void {
        const record: SecurityAuditRecord = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: Date.now(),
            source,
            isSafe,
            threatLevel,
            violationCount: violationsSummary.length,
            violationsSummary,
        };

        this.auditHistory.unshift(record);
        if (this.auditHistory.length > this.MAX_AUDIT_RECORDS) {
            this.auditHistory.pop();
        }
    }

    public getAuditHistory(): SecurityAuditRecord[] {
        return [...this.auditHistory];
    }

    private extractSnippet(text: string, regex: RegExp): string {
        const match = regex.exec(text);
        if (!match) return '';
        const index = match.index;
        const start = Math.max(0, index - 25);
        const end = Math.min(text.length, index + match[0].length + 25);
        const snippet = text.substring(start, end).replace(/[\r\n]+/g, ' ');
        return `...${snippet.trim()}...`;
    }
}

export const cssSecurityService = CssSecurityService.getInstance();

# CssSecurityService

**File:** `src/Services/cssSecurity.service.ts`

Security engine providing static analysis, de-obfuscation, sanitization, and secure HTTP ingestion for CSS stylesheets.
Guards the application against Cross-Site Scripting (XSS), Server-Side Request Forgery (SSRF), HTML tag breakout, CSS keyloggers, and Denial of Service (DoS) payloads.

---

## Purpose

- Inspect arbitrary CSS stylesheets (pasted into the editor, uploaded via file, or fetched from a URL) before DOM application.
- Detect and classify security vulnerabilities into clear severity levels (`critical`, `high`, `medium`, `low`).
- Sanitize dangerous CSS directives in-place, neutralizing threats while preserving valid visual properties.
- Validate remote URLs against SSRF vectors (blocking RFC 1918 private subnets, loopback addresses, cloud metadata services, and internal robot ports).
- Enforce strict size limits (512 KB) and timeout controls (8 s) to prevent client-side DoS.
- Maintain an in-memory audit history of security scans for diagnostics.

---

## Types

### `ThreatSeverity` & `ThreatCategory`

```typescript
export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ThreatCategory =
    | 'xss'
    | 'ssrf'
    | 'breakout'
    | 'exfiltration'
    | 'remote_code'
    | 'untrusted_resource'
    | 'dos';
```

---

### `CssViolation`

Represents an individual security rule trigger:

```typescript
export interface CssViolation {
    ruleId: string;
    severity: ThreatSeverity;
    category: ThreatCategory;
    description: string;
    matchedSnippet?: string;
    line?: number;
}
```

---

### `CssSecurityInspectionResult`

Output returned by `inspectCss()`:

```typescript
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
```

---

### `SecurityPolicyOptions`

Configurable security parameters:

```typescript
export interface SecurityPolicyOptions {
    allowPrivateIps?: boolean;      // Default: false
    allowExternalImports?: boolean; // Default: false
    maxSizeBytes?: number;          // Default: 524,288 (512 KB)
    timeoutMs?: number;             // Default: 8,000 (8 s)
    strictMode?: boolean;           // Default: true (throws on critical/high)
}
```

---

### `SecurityInspectionError`

Custom error thrown when a stylesheet or URL violates security policies:

```typescript
export class SecurityInspectionError extends Error {
    public readonly violations: CssViolation[];
    public readonly threatLevel: string;
}
```

---

## Threat Detection Engine

The service evaluates stylesheets against a battery of targeted threat rules:

| Rule ID | Category | Severity | Detection Vector |
|---|---|---|---|
| `dos-size-exceeded` | `dos` | `critical` | Stylesheet exceeds maximum size limit (default 512 KB). |
| `breakout-html-tag` | `breakout` | `critical` | Embedded HTML tags (e.g. `</style>`, `<script>`, `<iframe>`). |
| `breakout-comment-cdata` | `breakout` | `high` | HTML comment sequences (`<!--`, `-->`) or `<![CDATA[` blocks. |
| `breakout-event-handler` | `xss` | `critical` | Inline JavaScript event attributes (`onerror=`, `onload=`, etc.). |
| `xss-script-protocol` | `xss` | `critical` | Executable pseudo-protocols (`javascript:`, `vbscript:`). |
| `xss-dynamic-expression` | `remote_code` | `critical` | Legacy dynamic CSS `expression(...)` executing script. |
| `remote-behavior-binding` | `remote_code` | `critical` | Legacy script attachment directives (`behavior: url(...)`, `-moz-binding`). |
| `xss-dangerous-data-uri` | `xss` | `high` | Scriptable `data:` URI MIME types (`text/html`, `image/svg+xml`, `text/javascript`). |
| `exfiltration-keylogger-selector` | `exfiltration` | `high` | Attribute selectors targeting passwords/tokens chained with remote background `url()` calls. |
| `untrusted-import-rule` | `untrusted_resource` | `high` | External `@import` declarations capable of chaining uninspected remote payloads. |
| `redress-invisible-overlay` | `exfiltration` | `medium` | Fixed-position full-screen elements with extreme z-index and opacity 0 (clickjacking). |
| `invalid-content-type` | `untrusted_resource` | `critical` | Remote server responds with non-CSS content type (e.g. `text/html`, `application/javascript`). |
| `ssrf-blocked` | `ssrf` | `critical` | Attempted fetch to loopback, private IP, metadata IP, or sensitive internal ports. |

---

## API

### `getInstance(): CssSecurityService` *(static)*

Returns the singleton instance.

```typescript
const securityService = CssSecurityService.getInstance();
```

---

### `validateUrl(url: string, customPolicy?): { isValid: boolean; error?: string }`

Validates remote CSS URLs before network fetching:
- Ensures protocols are strictly `http:` or `https:`.
- Rejects loopback addresses (`127.0.0.1`, `localhost`, `::1`, `*.local`, `*.lan`).
- Rejects private IPv4 ranges (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Rejects cloud instance metadata endpoints (`169.254.169.254`).
- Rejects dangerous internal ports (`22`, `25`, `9090` ROS Bridge, `11311` ROS Core).

---

### `normalizeCssForAnalysis(css: string): string`

De-obfuscates stylesheet text prior to regex inspection:
- Strips null bytes (`\0`).
- Decodes CSS Unicode hexadecimal escapes (e.g. `\6a\61\76\61` &rarr; `java`).
- Strips backslash character escaping.
- Strips multi-line CSS comment blocks used to break up sensitive keywords.

---

### `inspectCss(css: string, customPolicy?): CssSecurityInspectionResult`

Performs static analysis on the input CSS:
- Checks size constraints.
- Normalizes content.
- Runs pattern matching across all threat rules.
- Computes threat level (`safe`, `low_risk`, `high_risk`, `critical`).
- Generates a sanitized copy of the stylesheet.

```typescript
const result = securityService.inspectCss(customCss);
if (!result.isSafe) {
    console.warn('Violations found:', result.violations);
}
```

---

### `sanitizeCss(css: string): string`

Neutralizes dangerous declarations by rewriting them into harmless CSS comments or benign fallback URLs:
- Strips HTML breakout tags &rarr; `/* [REMOVED_HTML_TAG] */`.
- Replaces `javascript:` URLs &rarr; 1x1 transparent GIF placeholder + `/* [BLOCKED_SCRIPT_URL] */`.
- Replaces `expression(...)` &rarr; `inherit /* [BLOCKED_EXPRESSION] */`.
- Removes `@import` rules &rarr; `/* [BLOCKED_REMOTE_IMPORT] */`.
- Neutralizes keylogger exfiltration rules &rarr; `/* [BLOCKED_DATA_EXFILTRATION_RULE] */`.

---

### `fetchCssWithSecurity(url: string, customPolicy?): Promise<FetchCssResult>`

Secure network fetch pipeline for remote stylesheets:
1. Validates URL against SSRF policy via `validateUrl()`.
2. Initiates `fetch()` with an `AbortController` (default 8 s timeout).
3. Validates `Content-Type` header (rejects HTML/JS responses).
4. Verifies `Content-Length` header against size limits.
5. Measures actual downloaded byte size via `Blob`.
6. Inspects downloaded body with `inspectCss()`.
7. Records result in audit history.
8. Throws `SecurityInspectionError` in strict mode if critical/high violations are found.

---

### `getAuditHistory(): SecurityAuditRecord[]`

Returns the last 50 security scan audit records (most recent first).

```typescript
const history = securityService.getAuditHistory();
```

---

## Security Pipeline Flow

```
Input CSS / Remote URL
  │
  ├─ Remote URL?
  │    ├─ validateUrl() (SSRF filter, RFC 1918, Cloud Metadata, Sensitive Ports)
  │    ├─ fetch() with AbortController (8 s timeout)
  │    ├─ Content-Type check (must not be text/html, js, svg)
  │    └─ Content-Length & byte size limit check (<= 512 KB)
  │
  ▼
Static Analysis Pipeline
  │
  ├─ Byte Size Guard
  ├─ normalizeCssForAnalysis() (De-obfuscate Unicode escapes, null bytes, comments)
  ├─ Multi-vector Regex Inspection (XSS, Breakouts, Expressions, Keyloggers, Imports)
  │
  ▼
Output Generation
  │
  ├─ Categorize Threat Level ('safe' | 'low_risk' | 'high_risk' | 'critical')
  ├─ sanitizeCss() (In-place neutralization of harmful directives)
  ├─ recordAudit() (Append to in-memory audit ring buffer)
  │
  └─ Return CssSecurityInspectionResult
```

---

## Dependencies

- **None** — Built entirely with standard Web APIs (`URL`, `fetch`, `AbortController`, `Blob`, `FileReader`) and pure TypeScript. Zero external npm dependencies.

---

## Design Notes

- **De-obfuscation First**: Attackers frequently use CSS Unicode hex escapes (e.g. `jav\61 script:`) to bypass naive regexes. De-obfuscating before rule evaluation eliminates this bypass.
- **Defense in Depth**: Even if a stylesheet bypasses initial checks during typing, `ThemeService.applyActiveTheme()` always runs `sanitizeCss()` immediately before DOM insertion.
- **Fail-Safe Sanitization**: Rather than rejecting entire stylesheets for small issues, non-strict mode neutralizes only the hazardous rules, allowing legitimate styling to load safely.
- **Automated Verification**: Accompanied by an automated test suite in [`test/`](file:///c:/Dev/lucy_control_panel/test/) containing 3 safe stylesheets and 8 real-world exploit stylesheets (`npm test`).

# ThemeService

**File:** `src/Services/theme.service.ts`

Singleton runtime CSS theme engine.
It is the single source of truth for runtime theme state, palette resolutions, and DOM mutations (`<style>` tag and CSS custom properties).

---

## Purpose

- Manage active theme selection (default, curated presets, or custom CSS).
- Provide the sole runtime application point for injecting CSS custom properties into `document.documentElement` and `<style id="lucy-custom-theme-style">`.
- Persist user theme choices in `localStorage`.
- Integrate seamlessly with `CssSecurityService` to inspect and sanitize any loaded or user-edited stylesheet before DOM injection.
- Expose an event subscription system (`subscribe()`) consumed by `ThemeContext` to trigger reactive UI updates across the control panel.
- Export starter theme templates for user customization.

---

## Types

### `ThemePreset`

```typescript
export interface ThemePreset {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    colors: {
        main: string;
        secondary: string;
        highlight: string;
        text: string;
    };
    css?: string;
}
```

### Storage Keys

```typescript
export const THEME_STORAGE_KEYS = {
    ACTIVE_THEME: 'lucy_active_theme_id',
    CUSTOM_CSS: 'lucy_custom_theme_css',
    THEME_ENABLED: 'lucy_custom_theme_enabled',
    THEME_URL: 'lucy_theme_url',
} as const;
```

---

## API

### `getInstance(): ThemeService` *(static)*

Returns the singleton instance of `ThemeService`.

```typescript
const themeService = ThemeService.getInstance();
```

---

### `init(): void`

Initialises and applies the active theme from `localStorage` to the DOM.
Called once automatically on service creation if running in a browser environment.

```typescript
themeService.init();
```

---

### `subscribe(listener: () => void): () => void`

Registers a listener callback invoked whenever the theme state changes.
Returns an **unsubscribe** function.

```typescript
const unsubscribe = themeService.subscribe(() => {
    console.log('Theme changed:', themeService.getActiveThemeId());
});

// Later:
unsubscribe();
```

---

### State Management & Queries

| Method | Return Type | Description |
|---|---|---|
| `getActiveThemeId()` | `string` | Returns active theme identifier (e.g. `'default'`, `'midnight-cyan'`, `'custom'`). |
| `isCustomThemeEnabled()` | `boolean` | Returns `true` if custom styling is toggled on (`true` by default). |
| `getCustomCss()` | `string` | Returns the raw custom CSS string stored in `localStorage`. |
| `getThemeUrl()` | `string` | Returns the last successfully fetched theme URL. |
| `getActiveColors()` | `ThemePreset['colors']` | Resolves active 75-10-15 hex colors (main, secondary, highlight, text). |
| `getLastSecurityInspection()` | `CssSecurityInspectionResult \| null` | Returns the most recent security scan report. |

---

### Mutators

#### `setActiveTheme(themeId: string): void`
Activates a preset by ID or `'default'`. Updates `localStorage`, re-applies DOM styling, and notifies subscribers.

#### `setCustomThemeEnabled(enabled: boolean): void`
Enables or disables custom theming. When disabled, resets the application to canonical default styles.

#### `setCustomCss(css: string, sanitize = true): CssSecurityInspectionResult`
Inspects, sanitizes (default `true`), and stores custom CSS. Automatically switches active theme ID to `'custom'`, applies changes, and notifies subscribers.

#### `setThemeColors(colors: { main, secondary, highlight, text, textSecondary? }): void`
Synthesizes a minimal `:root` variable stylesheet with the base colors only and delegates to `setCustomCss()`. Surface tiers, lines and grid tints are derived by `applyActiveTheme()`.

#### `resetToDefault(): void`
Clears custom CSS and theme URLs from storage, resets active theme to `'default'`, and restores baseline variables.

---

### Remote & File Ingestion

#### `loadThemeFromUrl(url: string, customPolicy?): Promise<FetchCssResult>`
Fetches remote CSS via `CssSecurityService.fetchCssWithSecurity()`. Validates against SSRF, size limits, and injection patterns before storing and applying.

#### `loadThemeFromFile(file: File, customPolicy?): Promise<string>`
Reads a local `.css` file via `FileReader`, runs security inspection, rejects files containing critical/high threats, and applies safe rules.

---

### DOM Injection Engine

#### `applyActiveTheme(): void`
The central DOM mutation point.
1. Injects canonical default variables into `document.documentElement` via `injectThemeVariables()`.
2. Locates or creates `<style id="lucy-custom-theme-style">` in `document.head`.
3. Sanitizes and injects preset or custom CSS rules into the `<style>` tag.
4. Directly applies the four base colors (`--color-main`, `--color-secondary`, `--color-highlight`, `--color-text-primary`) on `document.documentElement.style`.
5. Fills in every **derived token** the theme did not define itself, using `deriveSurfaceTokens()` (see below). A theme that defines the legacy `--color-main-elevated` but not `--color-surface-2` has it reused for that tier.
6. Syncs `document.body.style.backgroundColor` (`--color-bg`, falling back to main) to prevent white flicker during page loads.

---

## Design Tokens

Only the four base colors are required; everything else is derived from them by
`deriveSurfaceTokens()` in `src/Constants/theme.ts` and can be overridden by a theme.

| Token | Default derivation | Use |
|---|---|---|
| `--color-bg` | main | Page canvas (under the grid) |
| `--color-surface-1` | main +3% | Cards, panels, modals |
| `--color-surface-2` | main +6% | Headers, buttons, popovers |
| `--color-surface-3` | main +10% | Hover / active fills, tooltips |
| `--color-main-deep` | main −4% | Recessed wells (inputs, terminals) |
| `--color-line` | secondary @ 45% | Soft frames & dividers |
| `--color-line-strong` | secondary | Control frames |
| `--color-highlight-soft` | highlight @ 10% | Hover tints, table row hover |
| `--color-highlight-glow*` | highlight @ 25 / 55 / 12% | Glows |
| `--color-grid-dot` / `--color-grid-line` | text @ 10% / 4.5% | Page background grid; `transparent` disables it |

Non-hex colors are derived with `color-mix()`; hex colors use exact math so antd (which
needs plain colors) can be fed the same values from `ThemeContext`.

### Chamfer system (`src/index.css`)

Every chamfered element (cards, modals, buttons, inputs, selects, tags, tooltips, tables,
toggles, `.chamfer-box`) is driven by four variables: `--chamfer` (cut size), `--frame`
(border colour), `--fill` (background) and `--hud` (corner brackets on containers).
`--frame`, `--fill` and `--hud` are registered with `@property` so state changes animate.
Utilities: `.chamfer-box[-xs|-sm|-md|-lg|-modal]`, `.hud-corners`, `.hud-corners-hover`,
`.section-label`, `.status-led[-pulse]`.

---

### Template Utilities

#### `getThemeTemplateCss(): string`
Returns the starter blueprint stylesheet (`LUCY_THEME_TEMPLATE_CSS`).

#### `exportThemeTemplateFile(): void`
Generates a downloadable `lucy-theme.template.css` Blob and triggers a browser download.

---

## Data Flow

```
User Action (Select Preset / Edit CSS / Upload File / Fetch URL)
  │
  ├─ URL/File Input ──► cssSecurityService.fetchCssWithSecurity() / inspectCss()
  │                      │
  │                      ├─ Violation detected (critical/high) ──► Rejection / Exception
  │                      └─ Safe or sanitized ──► sanitizedCss
  │
  ▼
setCustomCss() / setActiveTheme()
  │
  ├─ Save to localStorage (lucy_active_theme_id, lucy_custom_theme_css, ...)
  │
  ├─ applyActiveTheme()
  │    ├─ injectThemeVariables(root)               [Baseline tokens]
  │    ├─ cssSecurityService.sanitizeCss(css)      [Sanitization]
  │    ├─ styleTag.textContent = sanitizedCss      [CSS rules]
  │    ├─ root.style.setProperty(...)              [Dynamic CSS variables]
  │    └─ document.body.style.backgroundColor      [Body surface sync]
  │
  └─ notify() ──► ThemeContext ──► React Components Re-render
```

---

## Dependencies

| Import | Role |
|---|---|
| `src/Constants/theme.ts` | Canonical baseline tokens (`MAIN_COLOR`, `SECONDARY_COLOR`, `HIGHLIGHT_COLOR`, `injectThemeVariables`) |
| `src/Constants/builtinThemes.ts` | Curated presets definition (`BUILTIN_THEMES`, `ThemePreset`) |
| `src/Constants/themeTemplate.ts` | Starter CSS blueprint template string |
| `src/Services/cssSecurity.service.ts` | Security inspection, URL SSRF verification, and CSS sanitizer |

---

## Design Notes

- **Single DOM Application Point**: Consolidates competing theme injections across the codebase into one deterministic engine.
- **Fail-Safe Sanitization**: Even if custom CSS contains dangerous constructs, `applyActiveTheme()` passes it through `cssSecurityService.sanitizeCss()` before writing to `<style>`.
- **SSR Safe**: Checks `typeof document !== 'undefined'` before mutating DOM elements or reading `localStorage`.
- **Decoupled Architecture**: Static presets and templates reside in `Constants/`, keeping the service logic focused and lightweight.

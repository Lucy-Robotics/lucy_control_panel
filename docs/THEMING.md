# > LUCY CONTROL PANEL // THEME SYSTEM & CUSTOMIZATION GUIDE

Welcome to the **Lucy Control Panel** theming guide. This document explains how the visual design system works, the strict 75-10-15 ratio specifications, and how any user can create and apply custom themes using a simple CSS file.

---

## 1. Architecture & Theming Engine Overview

The Lucy Control Panel features a modular, runtime CSS theme engine:
- **Zero-Compile Theming**: Users can drop a `.css` file directly into the application, input a direct URL, or write live CSS in the in-app Quick CSS editor.
- **Single Source of Truth**: All colors, fonts, weights, spacings, and borders are defined once in [`src/Constants/theme.ts`](file:///c:/Dev/lucy_control_panel/src/Constants/theme.ts).
- **CSS Custom Properties**: The entire app is bound to CSS variables (`var(--color-main)`, `var(--color-secondary)`, `var(--color-highlight)`, etc.). Overriding `:root` in a custom stylesheet instantly updates every component, card, button, slider, and modal.
- **Persistence**: Your chosen theme or custom CSS is saved in your browser's local storage and survives page reloads.

---

## 2. Default Theme Specifications

The default theme provided with Lucy Control Panel adheres strictly to the following aesthetic rules:

### A. The 75% - 10% - 15% Color System

| Role | Percentage | Hex Code | Description & Usage |
| :--- | :---: | :---: | :--- |
| **Main Dominant** | **75%** | `#141414` | The dark obsidian canvas, surfaces, card backgrounds, modal bodies, and panels. |
| **Secondary** | **10%** | `#2B3E50` | Steel navy framing. **Used strictly for borders, subtle dividers, outlines, and small structural elements.** |
| **Highlight** | **15%** | `#00FF41` | Terminal phosphor green. The **identifying factor of the Lucy brand**, active states, focus glows, primary action buttons, and telemetry markers. |
| **Text Primary** | — | `#F7F1E5` | Warm parchment. **All readable text is rendered in `#F7F1E5`, not pure harsh white.** |
| **Text Secondary**| — | `#6C7D8E` | Muted slate for secondary labels, timestamps, and captions. |

### B. Title & Branding Signature
- **Title Prefix**: Always prefixed with `>` in `#00FF41` (e.g., `> LUCY`).
- **Separator**: Separators between titles and subsections are `//` in `#00FF41`.
- **Title Text**: Rendered in warm parchment `#F7F1E5`.
- **Sub-titles**: Styled in **ALL CAPS** with an **underline** (`text-transform: uppercase; text-decoration: underline;`).

### C. Typography & "Grease" (Weights)

| Tier | Size | Font Family | Grease (Weight) | Usage |
| :--- | :---: | :--- | :---: | :--- |
| **Graphical** | `50px` (Web: `40px`) | `Orbitron, sans-serif` | **Bold (700)** | Display counters, 404 header, hero labels |
| **Title** | `36px` (Web: `32px`) | `IBM Plex Mono, monospace` | **Regular (400) / Bold (700)** | Page headers, main modal titles |
| **Sub-titles** | `20px` / `16px` | `IBM Plex Mono, monospace` | **Bold (700)** | Section titles (ALL CAPS, underlined) |
| **Content (Body)**| `20px` (Web: `16px`) | `IBM Plex Mono, monospace` | **Regular (400) / Light (300)**| Standard labels, paragraphs, inputs |
| **Content (Small)**| `12px` | `IBM Plex Mono, monospace` | **Light (300)** | Technical telemetry, tags, tooltips |

### D. Layout Spacing
- **`30px` - Screen Border**: The outermost screen margin padding across the app.
- **`20px` - Standard Spacing**: Default spacing between cards, panels, and grid columns.
- **`40px` - Large Spacing**: Separation between distinct sections or modal footers.
- **`12px` - Small Spacing**: Compact spacing for form items, tags, and joint controls.

---

## 3. How to Create Your Own Custom Theme

Creating a custom theme requires only a simple CSS file that overrides the `:root` variables.

### Step 1: Download or Copy the Template
You can open **Settings** (gear icon) -> click **"Configure Themes & Custom CSS"** and choose **"Download Starter Template"**, or copy the template below:

```css
/**
 * My Custom Lucy Theme
 */
:root {
  /* ─── 75% Main Dominant (Background & Canvas) ─── */
  --color-main: #0B0F19;
  --color-main-surface: #0B0F19;
  --color-main-elevated: #131B2E;
  --color-main-deep: #06080E;

  /* ─── 10% Secondary (Borders & Framing) ────────── */
  --color-secondary: #1E293B;
  --color-secondary-border: #1E293B;
  --color-secondary-subtle: rgba(30, 41, 59, 0.45);

  /* ─── 15% Highlight (Brand Identity & Focus) ───── */
  --color-highlight: #00D8FF;
  --color-highlight-light: #4DE4FF;
  --color-highlight-glow: rgba(0, 216, 255, 0.25);
  --color-highlight-glow-strong: rgba(0, 216, 255, 0.55);

  /* ─── Typography & Content ─────────────────────── */
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #94A3B8;

  /* ─── Fonts & Spacing (Optional Overrides) ──────── */
  --font-graphical: 'Orbitron', sans-serif;
  --font-title: 'IBM Plex Mono', monospace;
  --font-content: 'IBM Plex Mono', monospace;

  --spacing-screen: 30px;
  --spacing-standard: 20px;
  --spacing-large: 40px;
  --spacing-small: 12px;
}
```

### Step 2: Apply Your Theme in the App

You have three easy ways to apply your theme:

#### Method A: File Upload (Drag & Drop)
1. Open Lucy Control Panel.
2. Click the **Settings** icon (gear in header) -> **"Configure Themes & Custom CSS"**.
3. Switch to the **"LOAD THEME FILE / URL"** tab.
4. Drag and drop your `.css` file or click **"BROWSE CSS FILE"**.
5. Your theme is applied instantaneously!

#### Method B: Quick CSS Editor (Live In-App Editing)
1. In the **"Themes"** modal, select the **"QUICK CSS EDITOR"** tab.
2. Paste or write your CSS rules directly in the code editor.
3. Click **"APPLY QUICK CSS"** to see live changes.

#### Method C: Load from Online URL
1. Host your `.css` file anywhere (e.g., GitHub Raw, Pastebin, or your server).
2. Paste the link into the **"Direct Raw CSS URL"** input.
3. Click **"FETCH & APPLY"**.

---

## 4. Complete List of Available CSS Variables

All components throughout the application read from these CSS variables:

| Variable | Default Value | Description |
| :--- | :---: | :--- |
| `--color-main` | `#141414` | Primary dominant background color |
| `--color-main-surface` | `#141414` | Surface background for cards, tables, modals |
| `--color-main-elevated` | `#1e1e1e` | Elevated list rows, headers |
| `--color-main-deep` | `#0a0a0a` | Deepest canvas layer, code backgrounds |
| `--color-secondary` | `#2B3E50` | Structural framing, borders, dividers |
| `--color-secondary-border` | `#2B3E50` | Border color for buttons, cards, panels |
| `--color-secondary-subtle` | `rgba(43,62,80,0.4)` | Faint inner dividers |
| `--color-highlight` | `#00FF41` | Brand highlight, active switch, primary CTA |
| `--color-highlight-light` | `#33ff66` | Hover state for highlight elements |
| `--color-highlight-glow` | `rgba(0,255,65,0.25)` | Subtle outer glow shadow |
| `--color-highlight-glow-strong` | `rgba(0,255,65,0.55)` | Prominent hover focus glow |
| `--color-text-primary` | `#F7F1E5` | Main readable text (Warm parchment) |
| `--color-text-secondary` | `#6C7D8E` | Muted secondary text |
| `--color-text-on-highlight` | `#141414` | Text displayed on top of highlight background |
| `--color-status-error` | `#FF4343` | Error alerts and disconnect indicators |
| `--color-status-warning` | `#FFAA00` | Warning alerts and degraded states |
| `--color-status-info` | `#00D8FF` | Info tags, live stream cyan feedback |
| `--font-graphical` | `'Orbitron', sans-serif` | Display heading font |
| `--font-title` | `'IBM Plex Mono', monospace` | Main title font |
| `--font-content` | `'IBM Plex Mono', monospace` | Body and code font |
| `--spacing-screen` | `30px` | Outer screen border padding |
| `--spacing-standard` | `20px` | Standard spacing between sections |
| `--spacing-large` | `40px` | Large spacing |
| `--spacing-small` | `12px` | Small spacing |

---

## 5. Built-in Preset Themes

The app comes out of the box with curated presets:
1. **Lucy Cybernetic (Default)**: Official 75-10-15 theme (`#141414` / `#2B3E50` / `#00FF41` / `#F7F1E5`).
2. **Protanopia**: Red-blind safe. Blue for OK/active, orange for errors, yellow for warnings (`#11151B` / `#2A3A4D` / `#3DA5FF` / `#F3F4F6`).
3. **Deuteranopia**: Green-blind safe. Sky blue for OK/active, coral red for errors, yellow for warnings (`#14161A` / `#33404F` / `#56B4E9` / `#F2F2F2`).
4. **Tritanopia**: Blue-yellow safe. Teal for OK/active, rose red for errors, pale pink for warnings (`#161214` / `#3E2C33` / `#2EC4B6` / `#F7F0F2`).
5. **Monochrome**: Achromatopsia. Pure grayscale on black; states form a lightness ladder (white OK → light grey info → mid grey warning → dark grey error), with label and icon carrying the meaning (`#000000` / `#3A3A3A` / `#FFFFFF` / `#D6D6D6`).
6. **Lucy Light**: Lucy parchment canvas with white cards and modals, rich black text, navy framing and secondary text, neon Lucy green fills with black text for active states, dark green text, and steel blue for links and hover. All text meets WCAG AA 4.5:1, including on tinted fills; control frames meet 3:1 (`#F7F1E5` / `#6D8DB0` / `#006C2E` / `#141414`).

The colour-vision presets also recolour the status tokens (`--color-status-active`, `--color-status-error`, `--color-status-warning`, `--color-status-info`), which drive the header status badge, ON/OFF switches, joint markers and diagnostics. They also set `--color-text-on-error`, the text colour used on error-filled controls.

The colour-vision presets are checked against simulated protanopia, deuteranopia, tritanopia and achromatopsia (Machado et al. 2009, CIEDE2000), and every preset is checked against WCAG 2.2 contrast. `npm test` runs these checks.

A theme counts as light when `--color-main` is a hex colour with a relative luminance above 0.5. Light themes switch Ant Design to its light algorithm, `--color-main-deep` equals the canvas rather than a lighter tone, the derived surface tiers step darker and more gently (2/4/7% instead of 3/6/10%), `--color-line` uses a 50% tint of the secondary colour, and the `--color-highlight-light` hover tone darkens by 8% instead of lightening. Controls are framed with `--color-line-strong`, containers with `--color-line`. Light themes can also set optional tokens that add colour; each falls back to the dark-theme look when unset: `--color-accent-2` and `--color-accent-2-soft` (links and hover), `--color-header-fill` (card and modal header fill), `--color-header-divider` (1 px line under those headers), `--color-active-fill` (active tab) and `--color-status-tint` (percentage tint behind status boxes and alerts) and `--color-highlight-fill` / `--color-highlight-fill-hover` / `--color-error-fill` / `--color-warning-fill` (vivid fills with dark text, separate from the text-safe `--color-highlight`). Light themes also get `data-tone="light"` on `<html>`. A preset can also pin the surface tiers (`--color-surface-1/2/3`) instead of deriving them from `--color-main`; Lucy Light does this to put white cards on a parchment canvas. Set `--shadow-1`, `--shadow-2`, `--shadow-modal` and `--shadow-toolbar` to soften the shadows.

To switch between presets, click **"Themes"** in the header bar and click on any preset card!

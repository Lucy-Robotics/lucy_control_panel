# > LUCY CONTROL PANEL // COLOUR ACCESSIBILITY REPORT

How the built-in themes were checked for readability (contrast) and for colour-vision deficiency (CVD), with the methods, thresholds, sources and measured results.

> Run `npm test` to repeat every number in this document. The tables come from
> `node --experimental-strip-types test/run-theme-accessibility-tests.ts --report`.

---

## 1. Why this matters

| Condition | What is affected | Approximate prevalence |
| :--- | :--- | :--- |
| Protan (protanopia / protanomaly) | Long-wave (L, "red") cones missing or shifted. Reds look dark and merge with greens and yellows. | ≈1–2 % of men |
| Deutan (deuteranopia / deuteranomaly) | Medium-wave (M, "green") cones missing or shifted. Red, orange, yellow and green collapse onto one axis. | ≈5–6 % of men |
| Tritan (tritanopia) | Short-wave (S, "blue") cones missing. Blue merges with green, and yellow with pink or violet. | ≈1 in 10 000 |
| Achromatopsia (rod monochromacy) | No working cones. Only lightness is seen. | ≈1 in 30 000 |

Red–green deficiency together affects about **8 % of men and 0.4 % of women** of Northern-European descent (Birch 2012). In a team of robot operators, someone affected is likely.

The control panel signals robot state with colour: header status badge, ON/OFF switches, joint markers and the 3D viewer. The default theme is phosphor green `#00FF41` for OK, red `#FF4343` for errors and amber `#FFAA00` for warnings, which is close to the worst case for deutans. Simulated deuteranopia puts **OK vs warning at ΔE00 5.7**, a difference you can see side by side but can't reliably name on its own:

| Default theme status pair | ΔE00 normal | protanopia | deuteranopia | tritanopia |
| :--- | :---: | :---: | :---: | :---: |
| active / error | 85.8 | 37.7 | 16.9 ✗ | 80.4 |
| active / warning | 47.0 | 13.5 ✗ | **5.7 ✗** | 62.5 |
| active / info | 47.8 | 49.9 | 52.0 | 9.2 ✗ |
| error / warning | 36.8 | 25.5 | 14.0 ✗ | 19.5 ✗ |

This is why the colour-vision presets exist.

---

## 2. Method

### 2.1 Simulating colour-vision deficiency
Each colour is converted from sRGB to linear RGB and multiplied by the **Machado, Oliveira & Fernandes (2009)** matrix for the deficiency at **severity 1.0**, which models complete dichromacy. This model is physiologically based and derived from the stage theory of colour vision. It agrees with the earlier dichromat model of **Brettel, Viénot & Mollon (1997)** and **Viénot, Brettel & Mollon (1999)**, and Chrome DevTools and many accessibility tools use it. Severity 1.0 is the worst case for each deficiency type. Anomalous trichromats, the more common group, fall between normal vision and this case.

Achromatopsia is simulated by replacing each colour with its relative luminance Y (Rec. 709 weights), so only lightness remains.

### 2.2 Measuring difference: CIEDE2000
The simulated colours are converted to CIELAB (D65) and compared with **CIEDE2000** (CIE 2001), implemented after **Sharma, Wu & Dalal (2005)**. Under ideal viewing ΔE00 ≈ 1 is about one just-noticeable difference. **Szafir (2018)** showed that the difference needed to tell colours apart grows sharply as marks get smaller. Our status marks are small: 11 px labels and thin switch fills. "Noticeable when side by side" is also much weaker than "identifiable on its own", which is what an operator glancing at a status mark needs.

### 2.3 Thresholds

| Rule | Threshold | Source / rationale |
| :--- | :---: | :--- |
| Text contrast (all text tokens, status colours, highlight and its hover tone) on `bg` and every surface tier, `surface-3` (hover fills) included | **≥ 4.5 : 1** | WCAG 2.2 SC 1.4.3 (AA) |
| Text on filled controls (`text-on-highlight`, `text-on-error`) | **≥ 4.5 : 1** | WCAG 2.2 SC 1.4.3 |
| Control frames (`--color-line-strong`) on the canvas and panels; applied to Lucy Light, advisory on dark themes | **≥ 3 : 1** | WCAG 2.2 SC 1.4.11 |
| Container frames (`--color-line`) | reported only | Decorative; not covered by SC 1.4.11 |
| Each pair of {active, error, warning, info} under the preset's target deficiency | **ΔE00 ≥ 20** | Design margin for small marks (Szafir 2018); about 20 JNDs |
| The same pairs under normal vision | **ΔE00 ≥ 10** | The preset must still work for people with normal vision |
| Monochrome: neighbouring grey levels | **ΔL\* ≥ 14.5** | See 2.4 |

The ΔE00 threshold of 20 is our own design margin. WCAG doesn't set a colour-difference threshold.

### 2.4 Why Monochrome uses a lightness ladder instead of ΔE00 ≥ 20
For greys, CIEDE2000 depends only on ΔL\*, scaled down by its lightness weighting S<sub>L</sub>, which is about 1.6 near white. Every grey must still reach 4.5 : 1 on the lightest dark surface (`surface-3` `#1A1A1A`). That puts the darkest usable grey at L\* ≈ 54.8 (`#838383`), so four states must fit between L\* 54.8 and 100. The widest even ladder is about 15 L\* per step: no set of four compliant greys can reach ΔE00 20 for every pair. The test therefore requires ΔL\* ≥ 14.5 between neighbours, which is the largest even spacing integer greys allow. For achromatopsia, **lightness can carry only a coarse order of states**, so labels and icons must carry the meaning (WCAG 2.2 SC 1.4.1). See section 5.

### 2.5 Palette basis
The protan and deutan presets are built on the **Okabe–Ito Color Universal Design** palette (Okabe & Ito 2008; recommended in Wong 2011, *Nature Methods*): sky blue `#56B4E9`, yellow `#F0E442`, orange `#E69F00` and vermillion `#D55E00`. The palette relies on the blue–yellow axis, which protans and deutans keep, and on lightness differences.

The Okabe–Ito vermillion `#D55E00` reaches only **3.5 : 1** on the dark hover surface. The error colour was therefore lightened while staying in the orange–red family: `#DD7E33` for protanopia and `#E07D70` (coral) for deuteranopia. For deuteranopia the coral was chosen by search: among hues 0–40° that pass every contrast rule, it gives the largest margin to yellow under simulation (ΔE00 21.9 against 16.8 for an orange). **Tol (2021)** gives the same advice for qualitative schemes: separate the colours in lightness as well as hue.

Tritans keep the red–green axis, so the tritanopia preset pairs **teal (OK)** with **rose red (error)**. Warning (pale pink) and info (neutral grey) are separated from these by lightness.

---

## 3. Results: colour-vision presets

### 3.1 What changed

| Preset | Token | Before | After | Reason |
| :--- | :--- | :---: | :---: | :--- |
| Protanopia | `--color-status-error` | `#FFA630` | `#DD7E33` | error vs warning was **ΔE00 12.3** under protanopia; both looked yellow |
| Protanopia | `--color-status-info` | `#C9D1DB` | `#E6E6E6` | more lightness separation from active |
| Protanopia | `--color-text-secondary` / `-muted` | `#8A97A6` / `#6C7A8A` | `#A3AEBB` / `#8E99A5` | muted was 3.07 : 1 |
| Deuteranopia | `--color-status-error` | `#E66100` | `#E07D70` | 3.8 : 1 on hover surface; lightening it to the nearest compliant orange (`#EA7A29`) left only ΔE00 16.8 to warning under deuteranopia |
| Deuteranopia | `--color-status-info` | `#C9D1DB` | `#E6E6E6` | active vs info was ΔE00 19.5 |
| Deuteranopia | `--color-text-secondary` / `-muted` | `#8C96A3` / `#6E7884` | `#A7AFBA` / `#929AA3` | 4.41 / 2.95 : 1 |
| Tritanopia | `--color-status-error` | `#FF4D6D` | `#FF5B79` | 4.28 : 1 on hover surface |
| Tritanopia | `--color-text-secondary` / `-muted` | `#A2949A` / `#7D7076` | `#B4A8AD` / `#9E9498` | muted was 2.92 : 1 |
| Monochrome | `colors.main` | `#121212` | `#000000` | widens the lightness range available above the 4.5 : 1 floor |
| Monochrome | status active / info / warning / error | `#FFF` / `#BDBDBD` / `#CFCFCF` / `#9E9E9E` | `#FFF` / `#D3D3D3` / `#AAAAAA` / `#838383` | old warning vs info: **ΔE00 4.5 (ΔL\* 6.5)**, and warning sat *above* info. Now an even ladder of 100 → 84.6 → 69.6 → 54.8 |
| Monochrome | `--color-text-muted` | `#7A7A7A` | `#959595` | was 3.25 : 1 |

### 3.2 Measured values (after)

#### Protanopia (`cvd-protanopia`)

| Token | Value | on `bg` | on `surface-1` | on `surface-2` | on `surface-3` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `--color-text-primary` | `#F3F4F6` | 16.64 | 15.37 | 14.16 | 12.23 |
| `--color-text-secondary` | `#A3AEBB` | 8.13 | 7.52 | 6.92 | 5.98 |
| `--color-text-muted` | `#8E99A5` | 6.32 | 5.84 | 5.38 | 4.65 |
| `--color-highlight` | `#3DA5FF` | 7.00 | 6.46 | 5.96 | 5.14 |
| `--color-highlight-light` | `#63cbff` | 10.04 | 9.28 | 8.55 | 7.38 |
| `--color-status-active` | `#3DA5FF` | 7.00 | 6.46 | 5.96 | 5.14 |
| `--color-status-error` | `#DD7E33` | 6.20 | 5.72 | 5.28 | 4.55 |
| `--color-status-warning` | `#F0E442` | 13.85 | 12.79 | 11.79 | 10.18 |
| `--color-status-info` | `#E6E6E6` | 14.67 | 13.55 | 12.49 | 10.78 |
| `--color-line-strong` (control frame) | `#2A3A4D` | 1.58 ✗ | 1.46 ✗ | 1.34 | 1.16 |
| `--color-line` (container frame, decorative) | `rgba(42, 58, 77, 0.45)` | 1.20 | 1.17 | 1.14 | 1.07 |

`--color-text-on-highlight` on `--color-highlight`: **7.39:1** · `--color-text-on-error` on `--color-status-error`: **6.55:1**

| Status pair | ΔE00 (none) | ΔE00 (protanopia) |
| :--- | :---: | :---: |
| active / error | 49.6 | 53.5 |
| active / warning | 68.5 | 60.0 |
| active / info | 30.1 | 27.5 |
| error / warning | 35.5 | 24.4 |
| error / info | 33.5 | 34.7 |
| warning / info | 28.2 | 29.1 |

#### Deuteranopia (`cvd-deuteranopia`)

| Token | Value | on `bg` | on `surface-1` | on `surface-2` | on `surface-3` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `--color-text-primary` | `#F2F2F2` | 16.18 | 14.91 | 13.71 | 11.81 |
| `--color-text-secondary` | `#A7AFBA` | 8.18 | 7.54 | 6.93 | 5.97 |
| `--color-text-muted` | `#929AA3` | 6.36 | 5.86 | 5.39 | 4.64 |
| `--color-highlight` | `#56B4E9` | 7.85 | 7.23 | 6.65 | 5.73 |
| `--color-highlight-light` | `#7cdaff` | 11.50 | 10.59 | 9.74 | 8.39 |
| `--color-status-active` | `#56B4E9` | 7.85 | 7.23 | 6.65 | 5.73 |
| `--color-status-error` | `#E07D70` | 6.33 | 5.83 | 5.36 | 4.62 |
| `--color-status-warning` | `#F0E442` | 13.70 | 12.62 | 11.61 | 10.00 |
| `--color-status-info` | `#E6E6E6` | 14.51 | 13.37 | 12.30 | 10.59 |
| `--color-line-strong` (control frame) | `#33404F` | 1.71 ✗ | 1.58 ✗ | 1.45 | 1.25 |
| `--color-line` (container frame, decorative) | `rgba(51, 64, 79, 0.45)` | 1.23 | 1.20 | 1.17 | 1.10 |

`--color-text-on-highlight` on `--color-highlight`: **8.38:1** · `--color-text-on-error` on `--color-status-error`: **6.76:1**

| Status pair | ΔE00 (none) | ΔE00 (deuteranopia) |
| :--- | :---: | :---: |
| active / error | 46.9 | 41.7 |
| active / warning | 57.5 | 56.4 |
| active / info | 25.3 | 26.4 |
| error / warning | 46.5 | 21.9 |
| error / info | 31.2 | 24.8 |
| warning / info | 28.2 | 27.6 |

#### Tritanopia (`cvd-tritanopia`)

| Token | Value | on `bg` | on `surface-1` | on `surface-2` | on `surface-3` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `--color-text-primary` | `#F7F0F2` | 16.54 | 15.33 | 14.16 | 12.26 |
| `--color-text-secondary` | `#B4A8AD` | 8.09 | 7.50 | 6.93 | 6.00 |
| `--color-text-muted` | `#9E9498` | 6.32 | 5.86 | 5.41 | 4.68 |
| `--color-highlight` | `#2EC4B6` | 8.57 | 7.94 | 7.34 | 6.35 |
| `--color-highlight-light` | `#54eadc` | 12.54 | 11.63 | 10.74 | 9.30 |
| `--color-status-active` | `#2EC4B6` | 8.57 | 7.94 | 7.34 | 6.35 |
| `--color-status-error` | `#FF5B79` | 6.21 | 5.76 | 5.32 | 4.61 |
| `--color-status-warning` | `#FFB3C1` | 11.03 | 10.22 | 9.44 | 8.17 |
| `--color-status-info` | `#D9D9D9` | 13.16 | 12.20 | 11.27 | 9.75 |
| `--color-line-strong` (control frame) | `#3E2C33` | 1.43 ✗ | 1.32 ✗ | 1.22 | 1.06 |
| `--color-line` (container frame, decorative) | `rgba(62, 44, 51, 0.45)` | 1.15 | 1.12 | 1.09 | 1.02 |

`--color-text-on-highlight` on `--color-highlight`: **8.92:1** · `--color-text-on-error` on `--color-status-error`: **6.47:1**

| Status pair | ΔE00 (none) | ΔE00 (tritanopia) |
| :--- | :---: | :---: |
| active / error | 66.6 | 69.6 |
| active / warning | 52.8 | 53.5 |
| active / info | 26.2 | 26.0 |
| error / warning | 18.7 | 21.3 |
| error / info | 32.6 | 35.7 |
| warning / info | 22.0 | 22.8 |

#### Monochrome (`cvd-achromatopsia`)

| Token | Value | on `bg` | on `surface-1` | on `surface-2` | on `surface-3` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `--color-text-primary` | `#D6D6D6` | 14.45 | 13.78 | 13.19 | 11.97 |
| `--color-text-secondary` | `#A8A8A8` | 8.83 | 8.42 | 8.06 | 7.32 |
| `--color-text-muted` | `#959595` | 7.01 | 6.69 | 6.40 | 5.81 |
| `--color-highlight` | `#FFFFFF` | 21.00 | 20.03 | 19.17 | 17.40 |
| `--color-highlight-light` | `#ffffff` | 21.00 | 20.03 | 19.17 | 17.40 |
| `--color-status-active` | `#FFFFFF` | 21.00 | 20.03 | 19.17 | 17.40 |
| `--color-status-error` | `#838383` | 5.54 | 5.28 | 5.06 | 4.59 |
| `--color-status-warning` | `#AAAAAA` | 9.04 | 8.62 | 8.25 | 7.49 |
| `--color-status-info` | `#D3D3D3` | 14.03 | 13.38 | 12.80 | 11.63 |
| `--color-line-strong` (control frame) | `#3A3A3A` | 1.85 ✗ | 1.76 ✗ | 1.69 | 1.53 |
| `--color-line` (container frame, decorative) | `rgba(58, 58, 58, 0.45)` | 1.21 | 1.22 | 1.20 | 1.18 |

`--color-text-on-highlight` on `--color-highlight`: **21.00:1** · `--color-text-on-error` on `--color-status-error`: **5.54:1**

| Status pair | ΔE00 (none) | ΔE00 (achromatopsia) |
| :--- | :---: | :---: |
| active / error | 32.2 | 32.2 |
| active / warning | 20.0 | 20.0 |
| active / info | 9.5 | 9.5 |
| error / warning | 12.7 | 12.7 |
| error / info | 23.1 | 23.1 |
| warning / info | 10.7 | 10.7 |

Lightness ladder (L\*): active 100.0 → info 84.6 → warning 69.6 → error 54.8

---

## 4. Results: Lucy Light (white theme)

### 4.1 Problem
The light theme reused the dark theme's way of deriving tokens. Frames were `--color-line = alpha(secondary, 0.45)` over a pale `#C5CED8`, which gave **1.07–1.18 : 1**, so input, button and card borders all but disappeared. Text tokens met 4.5 : 1 only on the base canvas, and failed on the raised and hover surfaces. The hover tone `--color-highlight-light` was derived by *lightening* the green, which gave 2.45 : 1.

#### Before

| Token | Value | on `bg` | on `surface-1` | on `surface-2` | on `surface-3` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `--color-text-secondary` | `#4E5D6C` | 6.20 | 5.77 | 5.41 | 4.93 |
| `--color-text-muted` | `#5F6E7D` | 4.80 | 4.47 ✗ | 4.19 ✗ | 3.81 ✗ |
| `--color-highlight` | `#007A33` | 5.02 | 4.68 | 4.39 ✗ | 3.99 ✗ |
| `--color-highlight-light` | `#26A059` | 3.08 ✗ | 2.87 ✗ | 2.69 ✗ | 2.45 ✗ |
| `--color-status-error` | `#C62828` | 5.15 | 4.80 | 4.50 | 4.10 ✗ |
| `--color-status-warning` | `#965A00` | 5.12 | 4.77 | 4.47 ✗ | 4.07 ✗ |
| `--color-status-info` | `#0068A8` | 5.43 | 5.06 | 4.74 | 4.32 ✗ |
| `--color-line` (boundary) | `rgba(197, 206, 216, 0.45)` | 1.18 ✗ | 1.14 ✗ | 1.11 ✗ | 1.07 ✗ |
| `--color-secondary` (boundary) | `#C5CED8` | 1.46 ✗ | 1.36 ✗ | 1.27 ✗ | 1.16 ✗ |

### 4.2 Fix
The first strict pass reached full WCAG compliance with dark-slate frames everywhere and very dark accents, and it looked heavy. The final theme keeps WCAG AA for everything that carries information, and builds the look from the Lucy brand palette with the dark theme's colours inverted:

- **Parchment canvas, white cards.** The page (`--color-main`) is the Lucy parchment `#F7F1E5`, the dark theme's text colour. Cards, modals, tables, panels, buttons, tags and popovers (`--color-surface-1` / `-2`) are pure white `#FFFFFF`, and so are inputs and toggle tracks (`--color-main-deep`). Only hover and tooltips (`surface-3`) are a warm step, `#F2EBDD`. Modal and card headers share the card white and are set off by a 1 px navy line (`--color-header-divider`). The preset pins all these tiers instead of deriving them, and `ThemeContext` reads the applied values so Ant Design matches. Text is rich black `#141414`.
- **Two frame tiers.** `--color-line-strong` frames controls (buttons, inputs, selects, toggles, tags, modals) in brand navy `#6D8DB0`, at least **3 : 1 on the canvas and panels** (SC 1.4.11). `--color-line` frames containers (cards, panels, tables, rail) with a 50 % tint of it, about 1.6 : 1, because they are decorative. In `ThemeContext`, Ant Design control borders use the strong frame on light themes.
- **More colour than the dark theme**, through optional tokens. Each falls back to the dark-theme behaviour, so other presets don't change:

| Token | Lucy Light | Used for |
| :--- | :---: | :--- |
| `--color-accent-2` / `-soft` | `#2F5D84` / 10 % | Second accent: links, hover on buttons, tabs, nav, rail, toggles. Green stays "active / selected". |
| `--color-active-fill` | green 10 % | Background of the active tab |
| `--color-highlight-fill` / `-fill-hover`, `--color-error-fill`, `--color-warning-fill` | `#00FF41` / `#00E03A`, `#FF4343`, `#FFAA00` | Vivid fills: primary buttons, active nav, the RELEASE CONTROL button, ON/OFF toggles, tab ink bar, sliders, switches, title bars and the remote-control border. Text on them is black `#141414` (13.5 : 1 on green, 10.3 : 1 on hover green, 5.4 : 1 on red). Text-coloured green stays the dark `#006C2E`, because neon green as text on white is only 1.4 : 1 |
| `--color-status-tint` | `10%` | Tinted fill of header status boxes (via `--status-color`), alerts and the robot arm button |

- **Navy instead of grey or brown.** Frames, secondary text and muted text come from the Lucy gray-blue `#2B3E50`, saturated so they read as colour rather than grey: frames `#6D8DB0`, text `#2B3E50` / `#4B617A`. Canvas grid dots, shadows, off-state switch tracks (Ant Design `Switch`) and the disabled-switch fill use the same navy family.
- **Ant Design colours tuned for pure white.** On light themes, `themeService` sets `data-tone="light"` on `<html>`. Preset `Tag` colours (green, orange, red, blue) are then remapped to the status tones; they were 1.7–3.6 : 1 on parchment. Ant Design's description, tertiary and placeholder text use `--color-text-muted`; their translucent black was 1.8–3.3 : 1. A live audit of every visible text node against its rendered background, including chamfered pseudo-element fills, found no text under 4.5 : 1 on the control, sensors and configuration pages. The audit was first checked against deliberately injected failures.
- **Accents re-fitted** so text stays at 4.5 : 1 on every surface *and* on its own tinted fill: green `#006C2E`, error `#B42424`, warning `#895200`, info `#00629E`, text-secondary/muted `#2B3E50` / `#4B617A`. Hover green is the highlight darkened by 8 %.

#### After
| Token | Value | on `bg` | on `surface-1` | on `surface-2` | on `surface-3` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `--color-text-primary` | `#141414` | 16.38 | 18.42 | 18.42 | 15.53 |
| `--color-text-secondary` | `#2B3E50` | 9.79 | 11.01 | 11.01 | 9.28 |
| `--color-text-muted` | `#4B617A` | 5.67 | 6.38 | 6.38 | 5.38 |
| `--color-highlight` | `#006C2E` | 5.86 | 6.59 | 6.59 | 5.56 |
| `--color-highlight-light` | `#00581a` | 7.74 | 8.71 | 8.71 | 7.34 |
| `--color-status-active` | `#006C2E` | 5.86 | 6.59 | 6.59 | 5.56 |
| `--color-status-error` | `#B42424` | 5.80 | 6.52 | 6.52 | 5.50 |
| `--color-status-warning` | `#895200` | 5.71 | 6.42 | 6.42 | 5.41 |
| `--color-status-info` | `#00629E` | 5.76 | 6.48 | 6.48 | 5.46 |
| `--color-accent-2` | `#2F5D84` | 6.18 | 6.95 | 6.95 | 5.86 |
| `--color-line-strong` (control frame) | `#6D8DB0` | 3.07 | 3.45 | 3.45 | 2.91 |
| `--color-line` (container frame, decorative) | `rgba(109, 141, 176, 0.5)` | 1.67 | 1.74 | 1.74 | 1.63 |
| `--color-status-active` (on its tint) | `#006C2E` | 5.07 | 5.66 | 5.66 | — |
| `--color-status-error` (on its tint) | `#B42424` | 4.96 | 5.54 | 5.54 | — |
| `--color-status-warning` (on its tint) | `#895200` | 4.96 | 5.56 | 5.56 | — |
| `--color-status-info` (on its tint) | `#00629E` | 4.98 | 5.56 | 5.56 | — |
| `--color-accent-2` (on its tint) | `#2F5D84` | 5.35 | 6.01 | 6.01 | — |
| `--color-highlight` (on its tint) | `#006C2E` | 5.43 | 5.99 | 5.99 | — |

`--color-text-on-highlight` on `--color-highlight-fill`: **13.49:1** · `--color-text-on-highlight` on `--color-highlight-fill-hover`: **10.28:1** · `--color-text-on-error` on `--color-error-fill`: **5.38:1**

| Status pair | ΔE00 (none) | ΔE00 (protanopia) | ΔE00 (deuteranopia) | ΔE00 (tritanopia) |
| :--- | :---: | :---: | :---: | :---: |
| active / error | 62.7 | 9.2 | 9.1 | 57.6 |
| active / warning | 38.2 | 5.5 | 10.0 | 48.0 |
| active / info | 43.5 | 43.3 | 41.3 | 9.0 |
| error / warning | 23.9 | 9.0 | 2.8 | 11.3 |
| error / info | 45.5 | 40.7 | 49.1 | 52.1 |
| warning / info | 45.2 | 47.2 | 50.8 | 52.9 |

The status pairs in Lucy Light are tuned for normal vision. Under simulated protanopia and deuteranopia, error, warning and active fall to ΔE00 3–10. **People with a colour-vision deficiency should use one of the CVD presets.** These are all dark today; see section 6.

---

## 5. Colour is never the only cue (WCAG 2.2 SC 1.4.1)

No palette makes four states identifiable by colour alone for every viewer: achromatopsia leaves only lightness (section 2.4). The UI therefore has to carry meaning without colour as well:

| Element | Non-colour cue | Status |
| :--- | :--- | :--- |
| ON/OFF toggles (`ToggleSwitch`, `StreamSwitch`) | Visible `ON` / `OFF` text and `aria-label` | ✓ |
| Header ROS bridge status | Badge shown only while connected, with a person icon and the client count | ✓ |
| Disconnected / connecting state | Text in the page body (`LucyLoader`, `RosConnectionAlert`) | ✓ |
| Another client controls the robot | Border around the whole screen (no text explains it) | ~ partial |
| Header "multiple clients" warning | Colour change plus the count | ~ partial |

---

## 6. Limitations and follow-ups
- **Simulation is not perception.** The Machado model predicts average dichromat responses. Individuals vary, and severity < 1 (anomalous trichromacy) isn't checked separately. Dichromacy is generally the harder case.
- **Ambient light, display gamut and small sizes** all reduce the differences measured here. That is why the margins are generous.
- **Dark presets' control frames** (`--color-line-strong`) are 1.2–1.9 : 1. The test suite reports them as warnings. Raising them would help low-vision users, but needs a design pass on the dark aesthetic.
- **The default brand theme** fails 4.5 : 1 for `--color-text-secondary` (3.21 : 1 worst case) and `--color-text-muted` (2.33 : 1), and its `text-on-error` reaches only 3.04 : 1. The suite reports these as advisories, not failures, so the brand palette isn't changed here.
- **Light CVD presets** don't exist yet. A user who needs both a light theme and a CVD-safe palette has no preset.
- **The header logo** (`public/logo.png`) is a fixed mint-green raster. WCAG exempts logotypes from contrast rules, but on Lucy Light it is about 1.4 : 1, and in Monochrome it is the only non-grey element. Rendering it as a CSS mask filled with `var(--color-highlight)` would make it follow the theme. This is a brand decision, so it isn't changed here.

---

## 7. References
1. Birch, J. (2012). Worldwide prevalence of red-green color deficiency. *Journal of the Optical Society of America A*, 29(3), 313–320.
2. Brettel, H., Viénot, F., & Mollon, J. D. (1997). Computerized simulation of color appearance for dichromats. *JOSA A*, 14(10), 2647–2655.
3. Viénot, F., Brettel, H., & Mollon, J. D. (1999). Digital video colourmaps for checking the legibility of displays by dichromats. *Color Research & Application*, 24(4), 243–252.
4. Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A physiologically-based model for simulation of color vision deficiency. *IEEE Transactions on Visualization and Computer Graphics*, 15(6), 1291–1298.
5. Sharma, G., Wu, W., & Dalal, E. N. (2005). The CIEDE2000 color-difference formula: Implementation notes, supplementary test data, and mathematical observations. *Color Research & Application*, 30(1), 21–30.
6. Szafir, D. A. (2018). Modeling color difference for visualization design. *IEEE TVCG*, 24(1), 392–401.
7. Okabe, M., & Ito, K. (2008). *Color Universal Design (CUD): How to make figures and presentations that are friendly to colorblind people.* J\*Fly.
8. Wong, B. (2011). Points of view: Color blindness. *Nature Methods*, 8(6), 441.
9. Tol, P. (2021). *Colour Schemes.* SRON Technical Note SRON/EPS/TN/09-002, issue 3.2.
10. W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*, SC 1.4.1, 1.4.3, 1.4.11.

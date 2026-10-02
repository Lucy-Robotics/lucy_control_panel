<-- Welcome -->

## Welcome to the Lucy control panel.

This short getting-started guide will walk you through the basics of the control panel and help you get familiar with the main features.

> You can skip this guide with the button below.
> If you want to replay the guide, you can find it in the setting popup at the top right corner.

---

If you need more in-depth information, you can click the 'Documentation' button at any time or go to [this address](https://docs.lucy-robotics.com/share/p1x9ikjkhf/p/public-documentation-EExgMX2REV).

Additionally, if you need specific information or want to exchange on the project, you can join our [community discord server](https://discord.gg/g4KNZ3eeBd), we'll be more than happy to exchange with you!

---

Thanks for using Lucy, it means a lot to us ❤️.

With that being said, let's get started!

<-- ROS 2 -->

Let's have a quick word about ROS 2.

> [ROS](https://www.ros.org/) (Robot Operating System) is a standard in the field of robotic.

Lucy use ROS 2 internaly to manage everything, from connecting to the physical actuators to displaying the number of connected controller.

---

The control panel has to connect to this bridge everytime, which is made automatically for you by default.
> If at any point you need to update the connection URL, or toggle the auto-connect feature, you can visit the setting popup.

<-- Control -->

> This is where you'll control your robot, and it's full of stuff, so let's go over the basics!

First thing first, you will need to take control over the robot. This can be achieved by using the 'Control robot' toggle.
> This security system ensure that no more than one controller is sending instruction to your robot. When activated, this will take control from other control applications.

---

## Sliders

The main part of the screen is occupied by the 'actuators categories', each of them contains multiple actuators.

> You will be able to assign each & every actuator to a category in the configuration page.

Each of these actuators has its own control box, letting you update its position in real time.
Every slider comes with two indicators:
- The top green one indicates the default position for this actuator.
- The bottom blue one indicates the actual position. It will move more or less slowly depending on the physical configuration of the actuator.

<-- Poses & Animations -->

## Poses

In the top bar controls, you can find the 'Save pose' & 'Load pose' popups.

They will let you save every actuators position and load them at a later time when needed.

> Every pose is saved locally in your browser's localStorage.

---

## Animations

The animation system uses the saved poses.

> Once at least two poses are created, you will be able to select them in the 'Manage animation' popup and create an animation with them.

<-- Sensors -->

For this part, we will need to travel a bit.

- On the bottom right corner, you will find the navigation bar, select the second option 'Sensors'.

> It sure look empty, let's fix it!

Using the drop-down menu, you can select every sensors you want to watch.

---

> We currently support direct data display & temperatures, with a graph.
> If you have sensors whose data cannot be displayed, feel free to create an [issue](https://github.com/Lucy-Robotics/lucy_control_panel/issues) or to [contact us](https://discord.gg/g4KNZ3eeBd) directly.

<-- Themes & Customization -->

## Customizing Your Control Panel

Lucy Control Panel comes with a built-in theme engine designed to let both casual users and developers personalize the interface.

> Access the theme customizer anytime from **Settings -> Themes & Custom Styling** or the palette icon in the navigation bar.

---

### How Themes Work

Lucy is built around a high-contrast **75% - 10% - 15%** visual hierarchy:
- **75% Dominant Main Surface**: Canvas, panels, windows, and backdrops (`--color-main`).
- **10% Secondary Framing**: Borders, dividers, and chamfered container edges (`--color-secondary`).
- **15% Highlight Accent**: Active sliders, brand indicators, toggles, and status cues (`--color-highlight`).
- **Parchment Typography**: Warm, eye-friendly text (`--color-text-primary`) rather than harsh white.

---

### Built-in Presets & Quick Colors

- **Presets Tab**: Switch between curated themes like *Obsidian Green*, *Deep Matrix*, *Neon Cyber*, and *Void Amber* with a single click.
- **Quick Colors Tab**: For non-technical users, simple color pickers allow you to instantly tweak the background, borders, highlight accent, and text with a real-time live preview.

---

### Advanced: Creating Custom CSS Themes

For technical users and developers who want total control over the UI:

- **Theme Template**: In the **CSS Theme** tab, click **Download Theme Template (.css)** to get an annotated stylesheet containing every token and class name.
- **Root Variables Override**: Create a standard `.css` file and override `:root` variables:
  - `--color-main`: Primary surface color.
  - `--color-secondary`: Framing borders and dividers.
  - `--color-highlight`: Active cues and brand elements.
  - `--color-text-primary`: Primary text color.
  - `--chamfer-md`: Corner chamfer cut size.
- **Load Anywhere**: Drop your `.css` file directly into the upload area or enter a direct GitHub Raw / CDN URL. Your theme is saved locally and persists across browser refreshes!

<-- Configuration -->

The configuration page is undergoing a complete refactor, usage guide will be updated soon.

In the meantime, if you need more information, please refer to our [online documentation](https://docs.lucy-robotics.com/share/p1x9ikjkhf/p/public-documentation-EExgMX2REV).
# Lucy Control Panel
<!-- Advanced web-based control interface for InMoov humanoid robots with real-time 3D visualization -->

The default interface shipped with [Lucy](https://github.com/Lucy-Robotics/lucy_ws/).

---

## Prerequisites

| Tool | Required version | Notes |
|---|---|---|
| Node.js | **≥ 22.0.0** | `camera-controls` requires Node 22+ |
| Yarn | 1.x (classic) | `npm install -g yarn` |

> **Quick Node upgrade with nvm**
>
> If you have Node < 22 (e.g. the Ubuntu 24.04 Noble default 18.x), install nvm and switch:
> ```sh
> # Install nvm (skip if already installed)
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
> source ~/.bashrc   # or ~/.zshrc
>
> # Install and activate Node 22
> nvm install 22
> nvm use 22         # or: nvm use  (auto-reads .nvmrc)
>
> # Verify
> node --version     # should print v22.x.x
> ```
>
> A `.nvmrc` file at the project root pins the version — running `nvm use` from the directory is sufficient on future sessions.

---

## Installation

```sh
# 1. Clone the repository
git clone https://github.com/lucy-robotics/lucy_control_panel.git
cd lucy_control_panel

# 2. Switch to the required Node version (requires nvm)
nvm use

# 3. Install dependencies
yarn install

# 4. Copy the example environment file and fill in your values
cp .env.example .env
```

See the [Configuration](#️-configuration) section below for all available environment variables.

---

## Run

### Development

Starts the Vite dev server with hot-module replacement.

```sh
yarn run dev
```

The app is available at `http://localhost:3000` by default (or the port set in `VITE_PORT`).

### Production build

```sh
# Full build (TypeScript type-check + Vite bundle)
yarn build

# Quick build (Vite only, skips tsc)
yarn quickbuild

# Preview the production bundle locally
yarn preview
```

### HTTPS (self-signed certificates)

Required when the robot's ROS Bridge runs over HTTPS / WSS:

```sh
cd certs && ./generate_certificate.sh && cd ..
```

Then set in `.env`:

```env
VITE_HTTPS=true
VITE_SSL_CERT_PATH=./certs/cert.pem
VITE_SSL_KEY_PATH=./certs/key.pem
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root to configure the application:

```env
# Authentication (both required for password protection)
VITE_LOCAL_USERNAME=admin
VITE_LOCAL_PASSWORD=5d41402abc4b2a76b9719d911017c592

VITE_PORT=3000
VITE_OVERRIDE_ROS_BRIDGE_SERVER_URL=https://100.100.100.100:5000/rosbridge

VITE_ENABLE_LOGS=true

# Hardware YAML editor (`/robot-configuration`): header shows `robot_name` from loaded YAML (via ROS config/get).
```

### Authentication Setup

1. **Username**: Set `VITE_LOCAL_USERNAME` to your desired username
2. **Password**: Set `VITE_LOCAL_PASSWORD` to the MD5 hash of your password
   - Generate MD5 hash: `echo -n "yourpassword" | md5sum`
   - Example: Password "lucy123" → MD5 hash "5d41402abc4b2a76b9719d911017c592"

**Note**: If either `VITE_LOCAL_USERNAME` or `VITE_LOCAL_PASSWORD` is not set, the application will run without authentication.

---

## Tests

```bash
yarn test
```

---

## Documentation

For more details on creation processes, troubleshooting, and other guidance, visit the [Lucy Robotics documentation](https://docs.lucy-robotics.com).

---

## Code of Conduct

We value the participation of each member of our community and are committed to ensuring that every interaction is respectful and productive. To foster a positive environment, we ask you to read and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

By participating in this project, you agree to uphold this code in all your interactions, both online and offline. Let's work together to maintain a welcoming and inclusive community for everyone.

If you encounter any issues or have questions regarding the Code of Conduct, please contact us at [contact@lucy-robotics.com](mailto:contact@lucy-robotics.com).

Thank you for being a part of our community!

---

## Contributing 

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](code_of_conduct.md)

To find out more on how you can contribute to the project, please check our [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

This project is licensed under the terms of the GNU GPL V3 License.

See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- 🎉 [InMoov Project](https://inmoov.fr/) – Original design by Gael Langevin<br>
- 🎉 **All contributors** to the InMoov community<br>
- 🎉 [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) – 3D rendering capabilities<br>
- 🎉 [Three.js](https://threejs.org/) – WebGL 3D graphics library<br>

---

## Contact

- 📧 Email: [contact@lucy-robotics.com](mailto:contact@lucy-robotics.com)<br>
- 🌍 GitHub Organization: [Lucy Robotics](https://github.com/lucy-robotics)<br>

---

Made with ❤️ by the Lucy Robotics Team !
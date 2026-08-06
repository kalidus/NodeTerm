<div align="center">

  <img src="src/assets/app-icon.png" alt="NodeTerm Logo" width="80" style="border-radius:16px;"/>

  # 🚀 NodeTerm

  <b>A modern, multi-protocol "all-in-one" remote access client with built-in password vault and AI integration in an ultra-fast multi-tab workspace.</b>

  <p align="center">
    <a href="README.md"><img src="https://img.shields.io/badge/Language-🇪🇸_Español-lightgrey?style=flat-square" alt="Español"/></a>
    <a href="README.en.md"><img src="https://img.shields.io/badge/Language-🇬🇧_English-blue?style=flat-square" alt="English"/></a>
  </p>

  <p align="center">
    <a href="https://github.com/kalidus/NodeTerm/releases"><img src="https://img.shields.io/github/v/release/kalidus/NodeTerm?style=flat-square&color=2eb85c&logo=github&label=Version" alt="Latest Release"/></a>
    <a href="https://github.com/kalidus/NodeTerm/releases"><img src="https://img.shields.io/badge/Platforms-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=flat-square&logo=electron" alt="Platforms"/></a>
    <a href="#-advanced-ai-ecosystem-integrated-mcp-server"><img src="https://img.shields.io/badge/🤖_AI-MCP_Native-8a2be2?style=flat-square" alt="MCP Server"/></a>
    <a href="https://github.com/kalidus/NodeTerm/releases"><img src="https://img.shields.io/github/downloads/kalidus/NodeTerm/total?style=flat-square&color=007acc&logo=github&label=Downloads" alt="Total Downloads"/></a>
    <a href="https://github.com/kalidus/NodeTerm/stargazers"><img src="https://img.shields.io/github/stars/kalidus/NodeTerm?style=flat-square&color=ffb900&logo=github&label=Stars" alt="GitHub Stars"/></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License"/></a>
    <a href="#donate"><img src="https://img.shields.io/badge/Buy_me_a_coffee-☕_Donate-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black" alt="Donate"/></a>
  </p>

  <p align="center">
    <a href="https://github.com/kalidus/NodeTerm/releases/latest">
      <img src="https://img.shields.io/badge/📥_Download_NodeTerm-238636?style=flat-square" height="28" alt="Download"/>
    </a>
    &nbsp;
    <a href="#-quick-installation">
      <img src="https://img.shields.io/badge/⚡_Installation_Guide-1f6feb?style=flat-square" height="28" alt="Installation"/>
    </a>
  </p>

  <img src="src/assets/screenshot-main.png" alt="NodeTerm Screenshot" width="85%"/>

</div>

---

## ✨ Highlight Features

NodeTerm is an *all-in-one* remote workspace that unifies multiple connection protocols, an encrypted credential vault, and advanced AI automation capabilities within a modern, ultra-fast interface.

### 🌐 1. Connection & Multi-Protocol Support
- 🖥️ **Full Multi-Protocol**: Native support for **SSH**, **RDP** (Remote Desktop), **VNC**, and **SFTP** connections.
- 🛡️ **Professional SSH Management**: Wallix bastion integration, key/password authentication, and optimized connection pooling.
- 🗂️ **Multi-Tab Workspace**: Hierarchical session organization in folders and tab grouping by projects.
- 📁 **Integrated SFTP Explorer**: Visual remote navigation, file operations (copy, paste, delete), and smart search.

### 🤖 2. Advanced AI Ecosystem (Integrated MCP Server)
- 🔌 **Native MCP Server**: Standard Model Context Protocol to connect external AI agents (Claude, Cursor, Antigravity, AnythingLLM).
- 🛡️ **Security & Prompt Ticket**: Secure secret and credential injection (`promptTicket`) without exposing passwords to the AI agent.
- 📑 **Resource Access**: Authorized AI agents can query and manage connections, notes, documents, and active terminals.

### 🔒 3. Security & Credential Vault
- 🛡️ **AES-256 Encryption**: NodeTerm features full AES-256 encryption to protect all credentials and sensitive data stored locally.
- 🔑 **Master Password & Auto-Lock**: Single master password to unlock the app with configurable auto-lock timer.
- 📹 **Audit & Session Recording**: Built-in SSH session audit and recording system for compliance, debugging, and documentation.

### ⚡ 4. Productivity, Splits & Remote Tunneling
- 🖥️ **60 FPS Splits**: Powered by `xterm.js` with horizontal/vertical screen split, smooth resizing, and context menus.
- 🔌 **Advanced SSH Tunnels**: Local (`-L`), Remote (`-R`), and Dynamic SOCKS5 Proxy (`-D`) tunnels with automatic free port detection and orphan cleanup.
- 📹 **asciinema Audit & Recording**: Capture all SSH input/output in standard `asciicast v2` (.cast) format with built-in player.
- 🚀 **Ultra-Fast Boot**: Intelligent lazy loading of heavy modules and background services.

### 📊 5. System Monitoring & Diagnostics
- 📈 **Real-Time Telemetry**: Real-time CPU, RAM, and system load metrics with historical graphs.
- 🐧 **OS Auto-Detection**: Automatic Linux distro detection and visual connection status indicators.

### 🎨 6. Total Customization & UX
- 🎨 **UI & Terminal Themes**: Curated dark and light themes with customizable color palettes.
- 🔤 **Fonts & Icons**: Support for developer fonts with ligatures (*FiraCode*, *JetBrains Mono*) and icon packs (*Material*, *VSCode*).
- ⌨️ **Shortcuts & Layout**: Full keyboard customization, project-grouped tabs, and rich context menus.
- 🔄 **Auto-Updater**: Background update checker via GitHub Releases with Stable and Beta channels.

---

## 🚀 Quick Installation

### Desktop (Electron)
```sh
# Download the executable installer (.exe / .AppImage / .deb / pacman)
https://github.com/kalidus/NodeTerm/releases
```

<details>
<summary>🛠️ <strong>Local Development</strong></summary>

```sh
# Clone repository
git clone https://github.com/kalidus/NodeTerm.git
cd NodeTerm

# Node.js 24 LTS recommended (nvm: nvm install && nvm use)
# Linux (Arch/CachyOS): sudo pacman -S --needed base-devel python

# Install dependencies (without sudo)
npm install

# Development mode
npm run dev

# Build binary
npm run build:win
```

On Linux, `npm install` automatically repairs the Electron binary if the download was interrupted. Do not run `sudo npm install`.

</details>

---

## 📦 Version and Changelog

Detailed release history is maintained exclusively in **[CHANGELOG.md](CHANGELOG.md)**. Both [GitHub Releases](https://github.com/kalidus/NodeTerm/releases) and the `npm run release` script use it to publish notes.

| | |
|--|--|
| **Latest Release** | **[v1.7.4](https://github.com/kalidus/NodeTerm/releases/tag/v1.7.4)** (July 31, 2026) |
| **Installers** | [Releases Downloads](https://github.com/kalidus/NodeTerm/releases) |

---

## 🎨 Customization

- Change themes, icons, and fonts directly from the Settings menu.
- Sync preferences between desktop instances.

---

## 🏗️ Technical Architecture

<details>
<summary>🛠️ <strong>Stack & Structure</strong></summary>

**Tech Stack**
```
Frontend:  React 18 + PrimeReact + React Icons
Backend:   Electron 28 + Node.js
SSH:       node-ssh + ssh2-promise  
Terminal:  xterm.js + addons
Build:     Webpack 5 + Babel
```

**Project Structure**
```
NodeTerm/
├── 📁 src/
│   ├── 📁 components/     # React Components
│   ├── 📁 assets/         # CSS & Styles
│   └── 📄 themes.js       # Terminal Themes
├── 📄 main.js             # Electron Main Process
├── 📄 preload.js          # Preload Script
└── 📄 webpack.config.js   # Webpack Config
```

</details>

---

## 🗓️ Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| **v1.7.4** | Release clipboard hotfix | Published |
| **v1.7.3** | Performance, unified UX, Cygwin on-demand | Published |
| **v1.7.2** | Release process / CI | Published |
| **v1.7.1** | MCP agent: open terminals & secure inject | Included in 1.7.x |
| **v1.7.0** | SSH monitor, GPU/Linux & pacman | Included in 1.7.x |
| **v1.6.9** | Native MCP server | Published |
| **v1.8.0** | Multi-shell integrated terminal | Concept |

---

<a id="donate"></a>
## 💖 Support the Project

If **NodeTerm** helps you in your daily work and you'd like to support its ongoing development and maintenance, you can make a contribution or leave a ⭐ on GitHub.

<p align="left">
  <a href="https://github.com/sponsors/kalidus"><img src="https://img.shields.io/badge/GitHub_Sponsors-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" height="36" alt="GitHub Sponsors"/></a>
  &nbsp;
  <a href="https://ko-fi.com/kalidus"><img src="https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" height="36" alt="Ko-fi"/></a>
  &nbsp;
  <a href="https://buymeacoffee.com/kalidus"><img src="https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" height="36" alt="Buy Me A Coffee"/></a>
</p>

<p align="left">
  <a href="https://etherscan.io/address/0x7D18e60b2717edA94e6a48d05e6d09038dCf9342"><img src="https://img.shields.io/badge/Ethereum_%2F_EVM-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white" height="36" alt="Ethereum / EVM"/></a>
  &nbsp;
  <a href="https://solscan.io/account/DAP3efj9Fvp1uvf8eVse3dMTxxyw2bWLh4snA891iNZh"><img src="https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white" height="36" alt="Solana"/></a>
</p>

Every bit of support is greatly appreciated! 🙏 

---

## 🤝 Contributions

Contributions are welcome! If you'd like to improve NodeTerm:

1. 🍴 **Fork** the repository
2. 🌿 Create a **branch** for your feature (`git checkout -b feature/new-feature`)
3. 💾 **Commit** your changes (`git commit -m 'feat: add new feature'`)
4. 📤 **Push** to the branch (`git push origin feature/new-feature`)
5. 🔄 Open a **Pull Request**

---

## 🤖 About the Development

**NodeTerm** is an innovative project developed using **advanced AI** in human-machine collaboration. What started as a **vibe coding** experiment has evolved into a professional tool specifically designed for **infrastructure administrators** who need a robust SSH solution.

---

## 📄 License

MIT. Made with ❤️ by [kalidus](https://github.com/kalidus).

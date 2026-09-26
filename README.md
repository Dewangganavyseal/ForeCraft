# Forecraft (Forest Survival 3D)

A 3D Voxel Survival Action-RPG built with Three.js.

## Features
- **Voxel World Generation**: Dynamic biomes (Forest, Desert, Tundra, Mountain, Ocean, Beach, Redlands) with caves, rivers, villages, and dungeons.
- **Combat & Skills**: Real-time combo weapon system, shields, blocking, dodging, active skills, and extensive skill tree.
- **Crafting & Building**: Modular houses, workstations, anvils, cooking, and altar rituals.
- **NPCs & Pets**: Companion recruitment, party management, and beast taming.
- **Quest System**: Procedural notice board quests with 57 objectives and progression rewards.
- **Multi-Language**: Full localization support (Indonesian, English, Chinese, Japanese).
- **Online Multiplayer MMORPG**: Real-time 20Hz synchronization, 10 persistent world rooms (up to 50 players/room), player collision physics, shared biome spawn, host-authoritative mob & drop synchronization, 3D comic speech bubbles, and Cloudflare Named Tunnel integration (`forecraft.helloworld.my.id`).
- **100% Offline & Online**: Self-contained client-side web application, Capacitor Android APK, and dedicated server.

## Running the Game
Open `index.html` in any modern web browser, or serve using any static web server:
```bash
npm install
npm run build
```

## Running Dedicated Multiplayer Server
To host the dedicated multiplayer server with Cloudflare Tunnel:
```bash
# Windows Batch:
Double-click START_SERVER.bat

# Or using npm:
npm start
# or
npm run server
```
The server will automatically connect to Cloudflare Edge (`https://forecraft.helloworld.my.id`) and serve clients worldwide.

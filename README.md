# Assignment 2 – WebXR Campus AR Navigation (Proof of Concept)

This project is a starting point for your **Project 1** WebXR experience. It implements a **Babylon.js + WebXR** AR scene that matches the structure used in the `comp2144-26w-main` lessons (particularly lesson 8), but adapts it to your **accessible campus navigation** concept.

## What the Scene Demonstrates

- **WebXR immersive-AR session** created with `scene.createDefaultXRExperienceAsync`.
- A **floating AR arrow** that visually points toward a chosen destination.
- Simple **"sign" meshes** representing key locations in a small campus-like area:
  - Elevator
  - Classroom
  - Exit
- A minimal, accessible **on-screen UI** to:
  - Choose a destination (`Elevator`, `Classroom`, `Exit`)
  - Toggle **Audio On/Off** (logic is wired; you can later attach real audio clips).

This serves as a **proof-of-concept**: users would move around a small physical area and see AR cues that help them orient and navigate, rather than looking down at a flat map.

## Files

- `index.html` – Sets up the full-screen canvas, loads Babylon.js from CDN, and adds a small navigation UI bar for destination selection and audio toggle.
- `js/ar-campus.js` – Creates the Babylon scene, meshes, lighting, and WebXR AR session; wires the UI buttons to update the arrow and simulate audio guidance.

## Running the Project Locally

1. From the `assignment-2xr` folder, start a simple web server. For example, using `npx`:
   - `npx serve .`
   - or `npx http-server .`

2. Open the URL in a **WebXR-capable browser** on your phone/headset (e.g., recent Chrome/Android + WebXR enabled).

3. Tap the "Enter AR" / WebXR prompt when it appears.

4. Use the bottom UI:
   - Tap **Elevator / Classroom / Exit** to change the active destination.
   - Tap **Audio: On/Off** to toggle (you can later attach actual audio navigation prompts here).

## Next Steps for Project 1

- Replace the placeholder positions with measurements that better match a **real building or small campus area**.
- Add **audio clips** (Babylon `Sound` objects or HTML5 Audio) for spoken instructions.
- Enhance accessibility:
  - High-contrast materials
  - Larger meshes for easier visibility
  - Optional haptic or vibration cues when supported.
- Add more interactive elements (e.g., tap on a sign for detailed info about that location).


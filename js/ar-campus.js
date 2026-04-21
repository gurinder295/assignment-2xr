const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("status-text");
const uiRoot = document.getElementById("ui");
const audioToggleButton = document.getElementById("audio-toggle");
const hintBar = document.getElementById("hint-bar");
const hintDismissButton = document.getElementById("hint-dismiss");
const mapPath = document.getElementById("map-path");
const mapTarget = document.getElementById("map-target");

const engine = new BABYLON.Engine(canvas, true);

function setStatus(message) {
    if (statusText) {
        statusText.textContent = message;
    }
}

function speakInstruction(message) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

if (hintDismissButton && hintBar) {
    hintDismissButton.addEventListener("click", () => {
        hintBar.hidden = true;
        hintDismissButton.hidden = true;
    });
}

function createScene() {
    const scene = new BABYLON.Scene(engine);

    // Babylon still needs a camera in AR mode before XR takes over.
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        5,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);

    const hemi = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0.25, 1, 0.35), scene);
    hemi.intensity = 0.82;
    hemi.groundColor = new BABYLON.Color3(0.2, 0.22, 0.28);

    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.4, -1, -0.25), scene);
    sun.position = new BABYLON.Vector3(6, 10, 4);
    sun.intensity = 0.45;

    scene.clearColor = new BABYLON.Color4(0.06, 0.09, 0.14, 1);
    scene.imageProcessingConfiguration.contrast = 1.06;
    scene.imageProcessingConfiguration.exposure = 1.02;

    // Campus base model inspired by the Georgian map layout.
    const spreadScale = 1.35;
    const campusRoot = new BABYLON.TransformNode("campusRoot", scene);
    campusRoot.position = new BABYLON.Vector3(0, 0, 2.25);
    campusRoot.scaling = new BABYLON.Vector3(spreadScale, 1, spreadScale);

    function spreadPoint(x, y, z) {
        return new BABYLON.Vector3(x * spreadScale, y, z * spreadScale);
    }

    const ground = BABYLON.MeshBuilder.CreateGround("campusGround", { width: 4.8, height: 4.4 }, scene);
    ground.parent = campusRoot;
    ground.position.y = 0.01;
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.72, 0.8, 0.64);
    groundMat.specularColor = BABYLON.Color3.Black();
    ground.material = groundMat;

    const roadMat = new BABYLON.StandardMaterial("roadMat", scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.58, 0.61, 0.66);
    roadMat.specularColor = BABYLON.Color3.Black();

    const roadLineMat = new BABYLON.StandardMaterial("roadLineMat", scene);
    roadLineMat.diffuseColor = new BABYLON.Color3(0.92, 0.93, 0.96);
    roadLineMat.emissiveColor = new BABYLON.Color3(0.35, 0.36, 0.38);
    roadLineMat.specularColor = BABYLON.Color3.Black();

    const buildingMat = new BABYLON.StandardMaterial("buildingMat", scene);
    buildingMat.diffuseColor = new BABYLON.Color3(0.08, 0.36, 0.63);
    buildingMat.emissiveColor = new BABYLON.Color3(0.04, 0.1, 0.18);

    const lotMat = new BABYLON.StandardMaterial("lotMat", scene);
    lotMat.diffuseColor = new BABYLON.Color3(0.49, 0.51, 0.56);

    function createPad(name, width, depth, y, mat, x, z) {
        const pad = BABYLON.MeshBuilder.CreateBox(name, { width, depth, height: y }, scene);
        pad.parent = campusRoot;
        pad.position = new BABYLON.Vector3(x, y / 2, z);
        pad.material = mat;
        return pad;
    }

    function createBuildingLabel(text, x, z, yOffset = 0.14) {
        const labelPlane = BABYLON.MeshBuilder.CreatePlane(`label-${text}`, { width: 0.2, height: 0.2 }, scene);
        labelPlane.parent = campusRoot;
        labelPlane.position = new BABYLON.Vector3(x, yOffset, z);
        labelPlane.rotation.x = Math.PI / 2;

        const texture = new BABYLON.DynamicTexture(`label-${text}-tex`, { width: 256, height: 256 }, scene, true);
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, 256, 256);
        ctx.fillStyle = "rgba(8, 45, 86, 0.92)";
        ctx.beginPath();
        ctx.arc(128, 128, 108, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 130px Segoe UI";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 128, 136);
        texture.update();

        const mat = new BABYLON.StandardMaterial(`label-${text}-mat`, scene);
        mat.diffuseTexture = texture;
        mat.emissiveColor = new BABYLON.Color3(0.28, 0.55, 0.92);
        mat.backFaceCulling = false;
        labelPlane.material = mat;
        return labelPlane;
    }

    // Roads
    createPad("road-horizontal-south", 4.1, 0.42, 0.015, roadMat, 0, -1.35);
    createPad("road-horizontal-north", 3.8, 0.42, 0.015, roadMat, 0, 0.2);
    createPad("road-vertical-west", 0.4, 3.3, 0.015, roadMat, -1.2, -0.28);
    createPad("road-vertical-east", 0.4, 3.55, 0.015, roadMat, 1.15, -0.1);
    createPad("road-diagonal", 1.55, 0.4, 0.015, roadMat, 0.38, 0.68).rotation.y = Math.PI / 4.5;

    function addRoadDashLine(count, spacing, x, zStart, zStep, width, depth) {
        for (let i = 0; i < count; i += 1) {
            const dash = BABYLON.MeshBuilder.CreateBox(`road-dash-${x}-${i}`, { width, height: 0.008, depth }, scene);
            dash.parent = campusRoot;
            dash.position = new BABYLON.Vector3(x, 0.028, zStart + i * spacing * zStep);
            dash.material = roadLineMat;
        }
    }

    addRoadDashLine(9, 0.22, 1, -2.35, 1, 0.06, 0.1);
    addRoadDashLine(8, 0.24, -0.85, -2.2, 1, 0.06, 0.1);

    // Main buildings
    createPad("building-a", 0.55, 0.95, 0.12, buildingMat, 0.55, -0.85);
    createPad("building-j", 0.72, 1.05, 0.12, buildingMat, 0.02, -0.86);
    createPad("building-c", 0.6, 0.6, 0.12, buildingMat, -0.26, -0.25);
    createPad("building-k", 0.55, 0.72, 0.12, buildingMat, -0.65, -0.55);
    createPad("building-h", 0.52, 0.62, 0.12, buildingMat, 0.25, 0.2);
    createPad("building-d", 0.62, 0.62, 0.12, buildingMat, 0.88, 0.02);
    createPad("building-f", 0.56, 0.85, 0.12, buildingMat, 1.72, -0.62);
    createPad("building-e", 0.45, 0.78, 0.12, buildingMat, 0.35, 0.58);
    createPad("building-m", 0.46, 1.05, 0.12, buildingMat, -0.6, 0.62);
    createPad("building-n", 0.62, 0.45, 0.12, buildingMat, 0.4, 1.02);
    createPad("building-b", 0.52, 0.6, 0.12, buildingMat, -0.62, -1.24);

    // Letter markers make the 3D model easier to compare with the campus map.
    createBuildingLabel("A", 0.55, -0.85);
    createBuildingLabel("B", -0.62, -1.24);
    createBuildingLabel("C", -0.26, -0.25);
    createBuildingLabel("D", 0.88, 0.02);
    createBuildingLabel("E", 0.35, 0.58);
    createBuildingLabel("F", 1.72, -0.62);
    createBuildingLabel("H", 0.25, 0.2);
    createBuildingLabel("J", 0.02, -0.86);
    createBuildingLabel("K", -0.65, -0.55);
    createBuildingLabel("M", -0.6, 0.62);
    createBuildingLabel("N", 0.4, 1.02);

    // Parking and field-like blocks
    createPad("lot-west", 0.95, 1.22, 0.06, lotMat, -1.95, -0.65);
    createPad("lot-north-east", 0.88, 1.08, 0.06, lotMat, 1.72, 0.9);
    createPad("field-east", 0.95, 1.2, 0.05, lotMat, 2.0, -0.05);

    // A few tree markers to make the model feel less abstract.
    const treeMat = new BABYLON.StandardMaterial("treeMat", scene);
    treeMat.diffuseColor = new BABYLON.Color3(0.25, 0.62, 0.28);
    const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.35, 0.24, 0.16);
    trunkMat.specularColor = BABYLON.Color3.Black();
    [
        new BABYLON.Vector3(-2.18, 0.04, 1.45),
        new BABYLON.Vector3(-1.88, 0.04, 1.52),
        new BABYLON.Vector3(2.2, 0.04, 1.28),
        new BABYLON.Vector3(2.05, 0.04, 1.58),
        new BABYLON.Vector3(2.2, 0.04, -1.2),
    ].forEach((pos, idx) => {
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`tree-trunk-${idx}`, { height: 0.16, diameter: 0.05 }, scene);
        trunk.parent = campusRoot;
        trunk.position = new BABYLON.Vector3(pos.x, 0.09, pos.z);
        trunk.material = trunkMat;

        const tree = BABYLON.MeshBuilder.CreateSphere(`tree-${idx}`, { diameter: 0.14 }, scene);
        tree.parent = campusRoot;
        tree.position = new BABYLON.Vector3(pos.x, 0.2, pos.z);
        tree.material = treeMat;
    });

    const arrowBody = BABYLON.MeshBuilder.CreateBox(
        "arrowBody",
        { width: 0.14, height: 0.05, depth: 0.5 },
        scene
    );
    const arrowHead = BABYLON.MeshBuilder.CreateCylinder(
        "arrowHead",
        { diameterTop: 0, diameterBottom: 0.2, height: 0.23, tessellation: 4 },
        scene
    );
    arrowHead.rotation.x = Math.PI / 2;
    arrowHead.position.z = 0.36;

    const arrow = BABYLON.Mesh.MergeMeshes([arrowBody, arrowHead], true, undefined, undefined, undefined, true);
    arrow.rotationQuaternion = null;
    const arrowMat = new BABYLON.StandardMaterial("arrowMat", scene);
    arrowMat.diffuseColor = BABYLON.Color3.Black();
    arrowMat.specularColor = BABYLON.Color3.Black();
    arrowMat.emissiveColor = new BABYLON.Color3(0.15, 0.8, 1.0);
    arrow.material = arrowMat;

    const arrowRing = BABYLON.MeshBuilder.CreateTorus("arrowRing", { diameter: 0.55, thickness: 0.02, tessellation: 28 }, scene);
    arrowRing.rotation.x = Math.PI / 2;
    arrowRing.position.y = -0.06;
    arrowRing.parent = arrow;
    const ringMat = new BABYLON.StandardMaterial("arrowRingMat", scene);
    ringMat.diffuseColor = BABYLON.Color3.Black();
    ringMat.specularColor = BABYLON.Color3.Black();
    ringMat.emissiveColor = new BABYLON.Color3(0.2, 0.55, 0.95);
    ringMat.alpha = 0.55;
    arrowRing.material = ringMat;

    function createSign(name, label, labelColor, position) {
        const sign = BABYLON.MeshBuilder.CreatePlane(name, { width: 0.5, height: 0.28 }, scene);
        sign.position = position.clone();
        sign.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;

        const texture = new BABYLON.DynamicTexture(`${name}-texture`, { width: 512, height: 256 }, scene, true);
        const ctx = texture.getContext();
        ctx.fillStyle = "#102131";
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = "#e7eef8";
        ctx.lineWidth = 10;
        ctx.strokeRect(10, 10, 492, 236);
        ctx.fillStyle = labelColor.toHexString();
        ctx.fillRect(24, 24, 464, 36);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 66px Segoe UI";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 256, 155);
        texture.update();

        const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
        mat.diffuseTexture = texture;
        mat.emissiveColor = labelColor.scale(0.26);
        sign.material = mat;

        // Adds a post so the sign reads as a physical marker in AR space.
        const pole = BABYLON.MeshBuilder.CreateCylinder(`${name}-pole`, { height: 0.42, diameter: 0.03 }, scene);
        pole.position = new BABYLON.Vector3(position.x, position.y - 0.25, position.z);
        const poleMat = new BABYLON.StandardMaterial(`${name}-pole-mat`, scene);
        poleMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.4);
        pole.material = poleMat;
        return sign;
    }

    function createWaypoint(name, color, position) {
        const dot = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 0.09 }, scene);
        dot.position = position.clone();

        const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
        mat.emissiveColor = color;
        mat.alpha = 0.92;
        dot.material = mat;
        dot.isVisible = false;
        return dot;
    }

    const destinations = {
        buildingA: {
            label: "Building A",
            color: new BABYLON.Color3(0.24, 0.9, 0.55),
            signPosition: spreadPoint(0.55, 0.95, 1.05),
            route: [
                spreadPoint(0.24, 0.35, 1.15),
                spreadPoint(0.42, 0.35, 1.08),
                spreadPoint(0.53, 0.35, 1.02),
            ],
            message: "Follow the south central road to Building A.",
        },
        buildingH: {
            label: "Building H",
            color: new BABYLON.Color3(0.95, 0.8, 0.25),
            signPosition: spreadPoint(0.25, 0.95, 2.08),
            route: [
                spreadPoint(0.02, 0.35, 1.34),
                spreadPoint(0.15, 0.35, 1.7),
                spreadPoint(0.24, 0.35, 2.01),
            ],
            message: "Continue north on the center path to Building H.",
        },
        buildingJ: {
            label: "Building J",
            color: new BABYLON.Color3(0.96, 0.55, 0.34),
            signPosition: spreadPoint(0.02, 0.95, 1.02),
            route: [
                spreadPoint(-0.02, 0.35, 1.2),
                spreadPoint(0.0, 0.35, 1.08),
                spreadPoint(0.02, 0.35, 1.01),
            ],
            message: "Move straight ahead to Building J.",
        },
        buildingM: {
            label: "Building M",
            color: new BABYLON.Color3(0.35, 0.75, 1),
            signPosition: spreadPoint(-0.6, 0.95, 2.45),
            route: [
                spreadPoint(-0.18, 0.35, 1.28),
                spreadPoint(-0.42, 0.35, 1.72),
                spreadPoint(-0.58, 0.35, 2.3),
            ],
            message: "Take the northwest route toward Building M.",
        },
        buildingN: {
            label: "Building N",
            color: new BABYLON.Color3(0.88, 0.43, 0.95),
            signPosition: spreadPoint(0.4, 0.95, 2.86),
            route: [
                spreadPoint(0.08, 0.35, 1.36),
                spreadPoint(0.23, 0.35, 1.84),
                spreadPoint(0.37, 0.35, 2.56),
            ],
            message: "Go north-east past the junction to Building N.",
        },
    };

    const signs = {};
    const routeMarkers = {};
    Object.keys(destinations).forEach((key) => {
        const destination = destinations[key];
        signs[key] = createSign(`${key}-sign`, destination.label, destination.color, destination.signPosition);
        routeMarkers[key] = destination.route.map((point, i) =>
            createWaypoint(`${key}-marker-${i}`, destination.color, point)
        );
    });

    let activeDestinationKey = "buildingA";
    let routeLegIndex = 0;
    let routeLegCooldownUntil = 0;
    let audioEnabled = false;
    let lastDistanceAnnouncement = "";
    let destinationCompleted = false;

    function getNavigationLookTarget(key) {
        const destination = destinations[key];
        if (!destination) return null;
        if (routeLegIndex < destination.route.length) {
            return destination.route[routeLegIndex];
        }
        return destination.signPosition;
    }

    function updateHudArrowFromCamera() {
        const activeCam = scene.activeCamera;
        if (!activeCam || typeof activeCam.getForwardRay !== "function") return;

        const forwardRay = activeCam.getForwardRay(1.25);
        const hudDistance = 1.12;
        const hud = forwardRay.origin.add(forwardRay.direction.scale(hudDistance));
        arrow.position.copyFrom(hud);

        const lookTarget = getNavigationLookTarget(activeDestinationKey);
        if (!lookTarget) return;

        const flat = lookTarget.subtract(arrow.position);
        flat.y = 0;
        if (flat.lengthSquared() < 1e-5) return;

        const yaw = Math.atan2(flat.x, flat.z);
        arrow.rotationQuaternion = null;
        arrow.rotation = new BABYLON.Vector3(0, yaw, 0);
    }

    function toMiniMapPoint(vector) {
        // Keeps the small map centered around the user start area.
        const normalizedX = vector.x / spreadScale;
        const normalizedZ = vector.z / spreadScale;
        const x = Math.max(8, Math.min(92, 50 + normalizedX * 26));
        const y = Math.max(8, Math.min(92, 74 - normalizedZ * 20));
        return { x, y };
    }

    function updateMiniMapForDestination(key) {
        if (!mapPath || !mapTarget || !destinations[key]) return;
        const destination = destinations[key];
        const points = [new BABYLON.Vector3(0, 0, 0), ...destination.route, destination.signPosition];
        const mapped = points.map((point) => {
            const p = toMiniMapPoint(point);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        });

        mapPath.setAttribute("points", mapped.join(" "));
        const targetPoint = toMiniMapPoint(destination.signPosition);
        mapTarget.setAttribute("cx", targetPoint.x.toFixed(1));
        mapTarget.setAttribute("cy", targetPoint.y.toFixed(1));
        mapPath.setAttribute("stroke", destination.color.toHexString());
        mapTarget.setAttribute("fill", destination.color.toHexString());
    }

    function setRouteVisibility(key) {
        Object.keys(routeMarkers).forEach((routeKey) => {
            routeMarkers[routeKey].forEach((marker) => {
                marker.isVisible = routeKey === key;
            });
            signs[routeKey].isVisible = routeKey === key;
        });
    }

    function getDistanceToDestination(key) {
        const destination = destinations[key];
        const activeCam = scene.activeCamera;
        const from = activeCam && activeCam.globalPosition ? activeCam.globalPosition : camera.position;
        return BABYLON.Vector3.Distance(from, destination.signPosition);
    }

    function aimArrowAtDestination(key) {
        const destination = destinations[key];
        if (!destination) return;

        arrow.material.emissiveColor.copyFrom(destination.color);
        if (arrowRing && arrowRing.material && arrowRing.material.emissiveColor) {
            arrowRing.material.emissiveColor.copyFrom(destination.color);
            arrowRing.material.emissiveColor.scaleInPlace(0.55);
        }

        setRouteVisibility(key);
        setStatus(`Destination: ${destination.label}. Preparing AR guidance...`);
    }

    function announceCurrentDestination(forceSpeak) {
        const destination = destinations[activeDestinationKey];
        const meters = getDistanceToDestination(activeDestinationKey);
        const roundedMeters = Math.max(1, Math.round(meters));
        const spokenDistance = `${roundedMeters} meter${roundedMeters > 1 ? "s" : ""}`;
        const message = `${destination.message} Estimated distance ${spokenDistance}.`;

        setStatus(`Destination: ${destination.label}. Approx. ${spokenDistance} away.`);
        if (audioEnabled && forceSpeak) {
            speakInstruction(message);
        }
    }

    function selectDestination(key, forceSpeak) {
        if (!destinations[key]) return;
        activeDestinationKey = key;
        routeLegIndex = 0;
        routeLegCooldownUntil = 0;
        destinationCompleted = false;
        lastDistanceAnnouncement = "";
        aimArrowAtDestination(key);
        updateMiniMapForDestination(key);
        announceCurrentDestination(forceSpeak);

        if (uiRoot) {
            uiRoot.querySelectorAll("button[data-destination]").forEach((button) => {
                button.classList.toggle("active", button.getAttribute("data-destination") === key);
            });
        }
    }

    arrow.actionManager = new BABYLON.ActionManager(scene);
    arrow.actionManager.registerAction(
        new BABYLON.InterpolateValueAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            arrow,
            "scaling",
            new BABYLON.Vector3(1.2, 1.2, 1.2),
            170
        )
    );
    arrow.actionManager.registerAction(
        new BABYLON.InterpolateValueAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            arrow,
            "scaling",
            new BABYLON.Vector3(1, 1, 1),
            170
        )
    );

    scene.onBeforeRenderObservable.add(() => {
        updateHudArrowFromCamera();

        if (destinationCompleted) return;

        const activeCam = scene.activeCamera;
        const from =
            activeCam && activeCam.globalPosition ? activeCam.globalPosition.clone() : camera.position.clone();

        const legThreshold = 0.42 * spreadScale;
        const activeDestination = destinations[activeDestinationKey];
        const navTarget = getNavigationLookTarget(activeDestinationKey);
        const now = performance.now();
        if (
            navTarget &&
            routeLegIndex < activeDestination.route.length &&
            now >= routeLegCooldownUntil &&
            BABYLON.Vector3.Distance(from, navTarget) < legThreshold
        ) {
            routeLegIndex += 1;
            routeLegCooldownUntil = now + 700;
        }

        routeMarkers[activeDestinationKey].forEach((marker, index) => {
            const isCurrent = index === routeLegIndex;
            const bob = Math.sin(performance.now() * 0.003 + index * 0.4) * (isCurrent ? 0.055 : 0.03);
            marker.position.y = 0.35 + bob;
            const scale = isCurrent ? 1.35 : 0.88;
            marker.scaling.setAll(scale);
            if (marker.material && marker.material.emissiveColor) {
                marker.material.emissiveColor.copyFrom(activeDestination.color);
                if (!isCurrent) {
                    marker.material.emissiveColor.scaleInPlace(0.55);
                }
            }
        });

        const meters = Math.max(1, Math.round(getDistanceToDestination(activeDestinationKey)));
        const text = `${meters}m`;
        const exactDistance = getDistanceToDestination(activeDestinationKey);

        // Simple completion trigger once the user is near the destination marker.
        if (exactDistance <= 0.7 * spreadScale) {
            destinationCompleted = true;
            setStatus(`You have arrived at the ${destinations[activeDestinationKey].label}.`);
            arrow.material.emissiveColor.copyFrom(new BABYLON.Color3(0.3, 1, 0.3));
            if (arrowRing && arrowRing.material && arrowRing.material.emissiveColor) {
                arrowRing.material.emissiveColor.copyFrom(new BABYLON.Color3(0.2, 1, 0.35));
            }

            routeMarkers[activeDestinationKey].forEach((marker) => {
                marker.isVisible = false;
            });

            if (audioEnabled) {
                speakInstruction(`You have arrived at the ${destinations[activeDestinationKey].label}.`);
            }
            return;
        }

        if (audioEnabled && text !== lastDistanceAnnouncement && meters % 2 === 0) {
            lastDistanceAnnouncement = text;
            setStatus(`Destination: ${destinations[activeDestinationKey].label}. Approx. ${text} away.`);
        }
    });

    if (uiRoot) {
        uiRoot.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const destinationKey = target.getAttribute("data-destination");
            if (destinationKey) {
                selectDestination(destinationKey, true);
            }
        });
    }

    if (audioToggleButton) {
        audioToggleButton.addEventListener("click", () => {
            audioEnabled = !audioEnabled;
            audioToggleButton.textContent = audioEnabled ? "Audio: On" : "Audio: Off";
            audioToggleButton.setAttribute("aria-pressed", audioEnabled ? "true" : "false");
            audioToggleButton.classList.toggle("active", audioEnabled);

            if (audioEnabled) {
                announceCurrentDestination(true);
            } else if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        });
    }

    selectDestination(activeDestinationKey, false);
    return scene;
}

async function initializeXR(scene) {
    if (!navigator.xr) {
        setStatus("WebXR is unavailable in this browser. Use Chrome on Android or a WebXR headset browser.");
        return null;
    }

    let arSupported = false;
    try {
        arSupported = await navigator.xr.isSessionSupported("immersive-ar");
    } catch (error) {
        console.error("XR support check failed:", error);
    }

    if (!arSupported) {
        setStatus("This device does not support immersive AR. You can still preview the scene in 3D mode.");
        return null;
    }

    try {
        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: "immersive-ar",
                referenceSpaceType: "local-floor",
            },
            optionalFeatures: ["anchors", "hit-test"],
        });

        setStatus("AR ready. Tap Enter AR to start navigation.");

        xr.baseExperience.onStateChangedObservable.add((state) => {
            switch (state) {
                case BABYLON.WebXRState.ENTERING_XR:
                    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
                    setStatus("Entering AR session...");
                    break;
                case BABYLON.WebXRState.IN_XR:
                    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
                    setStatus("AR active. Follow the arrow and route markers.");
                    break;
                case BABYLON.WebXRState.EXITING_XR:
                    setStatus("Exiting AR session...");
                    break;
                case BABYLON.WebXRState.NOT_IN_XR:
                    scene.clearColor = new BABYLON.Color4(0.06, 0.09, 0.14, 1);
                    setStatus("AR session ended. Re-enter AR when ready.");
                    break;
                default:
                    break;
            }
        });

        return xr;
    } catch (error) {
        console.error("Failed to start XR:", error);
        setStatus("Unable to launch AR session. Reload and allow camera permissions.");
        return null;
    }
}

const scene = createScene();

initializeXR(scene).catch((error) => {
    console.error("Unexpected XR initialization error:", error);
    setStatus("Unexpected setup error. Please reload the page.");
});

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});

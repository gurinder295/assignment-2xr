const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// create the scene
const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        5,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);

    const light = new BABYLON.HemisphericLight(
        "light1",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.9;

    // Arrow that points toward the current destination
    const arrowBody = BABYLON.MeshBuilder.CreateBox(
        "arrowBody",
        { width: 0.15, height: 0.05, depth: 0.6 },
        scene
    );
    const arrowHead = BABYLON.MeshBuilder.CreateCylinder(
        "arrowHead",
        { diameterTop: 0, diameterBottom: 0.22, height: 0.25, tessellation: 4 },
        scene
    );

    arrowHead.rotation.x = Math.PI / 2;
    arrowHead.position.z = 0.45;

    const arrow = BABYLON.Mesh.MergeMeshes(
        [arrowBody, arrowHead],
        true,
        undefined,
        undefined,
        undefined,
        true
    );
    arrow.position = new BABYLON.Vector3(0, 0.5, 1.5);

    const arrowMat = new BABYLON.StandardMaterial("arrowMat", scene);
    arrowMat.emissiveColor = new BABYLON.Color3(0.1, 0.8, 1.0);
    arrow.material = arrowMat;

    // Simple "sign" blocks for key points of interest
    function createSign(name, labelColor, position) {
        const sign = BABYLON.MeshBuilder.CreateBox(
            name,
            { width: 0.4, height: 0.2, depth: 0.02 },
            scene
        );
        sign.position = position.clone();

        const mat = new BABYLON.StandardMaterial(`${name}-mat`, scene);
        mat.diffuseColor = labelColor;
        mat.emissiveColor = labelColor.scale(0.8);
        sign.material = mat;

        // Keep the sign facing the camera (billboard)
        sign.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        return sign;
    }

    const elevatorSign = createSign(
        "elevatorSign",
        new BABYLON.Color3(0.4, 1, 0.4),
        new BABYLON.Vector3(-0.8, 0.9, 2)
    );

    const classroomSign = createSign(
        "classroomSign",
        new BABYLON.Color3(1, 0.8, 0.2),
        new BABYLON.Vector3(0.8, 0.9, 2.3)
    );

    const exitSign = createSign(
        "exitSign",
        new BABYLON.Color3(1, 0.3, 0.3),
        new BABYLON.Vector3(0, 0.9, 3)
    );

    const destinations = {
        elevator: {
            target: elevatorSign.position,
            arrowColor: new BABYLON.Color3(0.4, 1, 0.8),
        },
        classroom: {
            target: classroomSign.position,
            arrowColor: new BABYLON.Color3(1, 0.8, 0.2),
        },
        exit: {
            target: exitSign.position,
            arrowColor: new BABYLON.Color3(1, 0.4, 0.4),
        },
    };

    let activeDestinationKey = "elevator";
    let audioEnabled = false;

    function aimArrowAtDestination(key) {
        const dest = destinations[key];
        if (!dest) return;

        const targetDir = dest.target.subtract(arrow.position);
        const yaw = Math.atan2(targetDir.x, targetDir.z);
        arrow.rotation = new BABYLON.Vector3(0, yaw, 0);

        arrow.material.emissiveColor = dest.arrowColor;

        if (audioEnabled) {
            // Placeholder for audio-guidance; hook up real audio clips here.
            console.log(`Audio: guiding user toward ${key}`);
        }
    }

    aimArrowAtDestination(activeDestinationKey);

    arrow.actionManager = new BABYLON.ActionManager(scene);
    arrow.actionManager.registerAction(
        new BABYLON.InterpolateValueAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            arrow,
            "scaling",
            new BABYLON.Vector3(1.2, 1.2, 1.2),
            200
        )
    );
    arrow.actionManager.registerAction(
        new BABYLON.InterpolateValueAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            arrow,
            "scaling",
            new BABYLON.Vector3(1, 1, 1),
            200
        )
    );

    const xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: "immersive-ar",
            referenceSpaceType: "local-floor",
        },
        optionalFeatures: true,
    });

    console.log("WebXR AR session ready:", xr);

    const uiRoot = document.getElementById("ui");
    const audioToggleButton = document.getElementById("audio-toggle");

    if (uiRoot) {
        uiRoot.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const destKey = target.getAttribute("data-destination");
            if (destKey && destinations[destKey]) {
                activeDestinationKey = destKey;
                aimArrowAtDestination(activeDestinationKey);

                uiRoot.querySelectorAll("button[data-destination]").forEach((btn) => {
                    btn.classList.toggle(
                        "active",
                        btn.getAttribute("data-destination") === activeDestinationKey
                    );
                });
            }
        });
    }

    if (audioToggleButton) {
        audioToggleButton.addEventListener("click", () => {
            audioEnabled = !audioEnabled;
            audioToggleButton.textContent = audioEnabled ? "Audio: On" : "Audio: Off";
            audioToggleButton.setAttribute("aria-pressed", audioEnabled ? "true" : "false");
            audioToggleButton.classList.toggle("active", audioEnabled);
        });
    }

    return scene;
};

createScene().then((sceneToRender) => {
    engine.runRenderLoop(() => sceneToRender.render());
});

window.addEventListener("resize", function () {
    engine.resize();
});


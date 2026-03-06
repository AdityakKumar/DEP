// =====================================================================
// IIT ROPAR 3D CAMPUS MODEL — Complete Hardcoded Build
// Every building shape, road, field, and feature modeled from
// satellite imagery analysis. No satellite tiles, no external APIs.
//
// World coordinate system:
//   X axis: left(-150) to right(+150)  ~300 units
//   Z axis: top(-100)  to bottom(+100) ~200 units
//   Y axis: up (height)
//
// Pixel→World mapping (from 2559x1599 image, sidebar at x<130):
//   wx = (px - 130) / 2429 * 300 - 150
//   wz = (py - 130) / 1469 * 200 - 100
// =====================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// =====================================================================
// 1. RENDERER, SCENE, CAMERA
// =====================================================================
const canvas = document.getElementById('campus3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // sky blue

// Gradient sky via hemisphere
const skyGeo = new THREE.SphereGeometry(800, 32, 15);
const skyMat = new THREE.ShaderMaterial({
    uniforms: {
        topColor:    { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xc8e6c9) },
        offset:      { value: 50 },
        exponent:    { value: 0.4 },
    },
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `,
    side: THREE.BackSide,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 1200);
camera.position.set(0, 160, 180);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// CSS2D label renderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '50';
document.body.appendChild(labelRenderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 15;
controls.maxDistance = 400;
controls.maxPolarAngle = Math.PI / 2.05;
controls.target.set(0, 0, 0);

// =====================================================================
// 2. LIGHTING
// =====================================================================
scene.add(new THREE.AmbientLight(0xd0dce8, 0.55));

const hemi = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.45);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff8e7, 1.5);
sun.position.set(150, 180, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -300; sc.right = 300; sc.top = 200; sc.bottom = -200;
sc.near = 1; sc.far = 600;
sun.shadow.bias = -0.0004;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x8ec8f0, 0.35);
fill.position.set(-120, 60, -60);
scene.add(fill);

// =====================================================================
// 3. MATERIALS LIBRARY
// =====================================================================
const MAT = {
    // Ground
    grass:      new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.95, metalness: 0 }),
    grassDark:  new THREE.MeshStandardMaterial({ color: 0x3d6b4a, roughness: 0.95, metalness: 0 }),
    grassLight: new THREE.MeshStandardMaterial({ color: 0x6aaf5e, roughness: 0.9, metalness: 0 }),
    field:      new THREE.MeshStandardMaterial({ color: 0x5da84e, roughness: 0.85, metalness: 0 }),
    dirt:       new THREE.MeshStandardMaterial({ color: 0xa08060, roughness: 0.95, metalness: 0 }),
    sand:       new THREE.MeshStandardMaterial({ color: 0xc4a87c, roughness: 0.9, metalness: 0 }),
    road:       new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85, metalness: 0.05 }),
    roadLight:  new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.8, metalness: 0.05 }),
    sidewalk:   new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8, metalness: 0 }),
    parking:    new THREE.MeshStandardMaterial({ color: 0x484848, roughness: 0.9, metalness: 0.05 }),
    water:      new THREE.MeshStandardMaterial({ color: 0x3a9ad9, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.8 }),
    // Buildings
    concrete:   new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.7, metalness: 0.05 }),
    concreteW:  new THREE.MeshStandardMaterial({ color: 0xf0ece6, roughness: 0.65, metalness: 0.05 }),
    brick:      new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.75, metalness: 0 }),
    brickDark:  new THREE.MeshStandardMaterial({ color: 0xa07050, roughness: 0.8, metalness: 0 }),
    glass:      new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.15, metalness: 0.55, transparent: true, opacity: 0.7 }),
    roof:       new THREE.MeshStandardMaterial({ color: 0xd0c8bc, roughness: 0.6, metalness: 0.1 }),
    roofRed:    new THREE.MeshStandardMaterial({ color: 0xb05040, roughness: 0.7, metalness: 0.05 }),
    roofDark:   new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.7, metalness: 0.1 }),
    metal:      new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.35, metalness: 0.6 }),
    gate:       new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 0.6, metalness: 0.15 }),
    hostel:     new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.7, metalness: 0.05 }),
    hostelAlt:  new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.7, metalness: 0.05 }),
    academic:   new THREE.MeshStandardMaterial({ color: 0xe0d8cc, roughness: 0.65, metalness: 0.05 }),
    academicB:  new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.65, metalness: 0.05 }),
    admin:      new THREE.MeshStandardMaterial({ color: 0xd4ccc0, roughness: 0.6, metalness: 0.08 }),
    sports:     new THREE.MeshStandardMaterial({ color: 0xc0a888, roughness: 0.7, metalness: 0 }),
    poolWater:  new THREE.MeshStandardMaterial({ color: 0x40a0d0, roughness: 0.1, metalness: 0.3 }),
    track:      new THREE.MeshStandardMaterial({ color: 0xc06030, roughness: 0.85, metalness: 0 }),
    white:      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 }),
};

// =====================================================================
// 4. COLORS FOR CATEGORIES (sidebar)
// =====================================================================
const CAT_COLORS = {
    academic: '#3b82f6', hostel: '#f59e0b', sports: '#10b981',
    admin: '#a855f7', landmark: '#ef4444', facility: '#06b6d4',
    dining: '#f97316', residential: '#78716c', infrastructure: '#64748b',
};

// =====================================================================
// 5. HELPER: CREATE SHAPE FUNCTIONS
// =====================================================================
const allMeshes = [];    // for raycasting
const meshById = {};     // id -> mesh
const labelById = {};    // id -> CSS2DObject
const origColor = {};    // id -> color hex
let selectedId = null;
let labelsVisible = true;

// Make a box building
function box(id, x, z, w, d, h, mat, castShadow = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.userData.id = id;
    scene.add(mesh);
    if (id) {
        allMeshes.push(mesh);
        if (!meshById[id]) meshById[id] = [];
        meshById[id].push(mesh);
    }
    return mesh;
}

// L-shaped building (2 boxes joined)
function lShape(id, x, z, w1, d1, w2, d2, h, mat, orient = 'BL') {
    // orient: which corner the L notch is at:
    // BL = bottom-left missing, BR, TL, TR
    const m1 = box(id, x, z, w1, d1, h, mat);
    let m2;
    if (orient === 'BL') {
        m2 = box(id, x + (w1 - w2) / 2, z - (d1 + d2) / 2 + d2 / 2, w2, d2, h, mat);
        m2.position.x = x + w1 / 2 - w2 / 2;
        m2.position.z = z + d1 / 2 + d2 / 2;
    } else if (orient === 'BR') {
        m2 = box(id, x - w1 / 2 + w2 / 2, z + d1 / 2 + d2 / 2, w2, d2, h, mat);
    } else if (orient === 'TL') {
        m2 = box(id, x + w1 / 2 - w2 / 2, z - d1 / 2 - d2 / 2, w2, d2, h, mat);
    } else {
        m2 = box(id, x - w1 / 2 + w2 / 2, z - d1 / 2 - d2 / 2, w2, d2, h, mat);
    }
    return [m1, m2];
}

// U-shaped building (3 boxes)
function uShape(id, x, z, w, d, wingW, wingD, h, mat) {
    // Main bar + 2 wings
    box(id, x, z, w, d, h, mat); // center bar
    box(id, x - w / 2 + wingW / 2, z - d / 2 - wingD / 2, wingW, wingD, h, mat); // left wing
    box(id, x + w / 2 - wingW / 2, z - d / 2 - wingD / 2, wingW, wingD, h, mat); // right wing
}

// Flat ground patch
function ground(x, z, w, d, mat) {
    const geo = new THREE.PlaneGeometry(w, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

// Road strip
function road(x, z, w, d) {
    const geo = new THREE.PlaneGeometry(w, d);
    const mesh = new THREE.Mesh(geo, MAT.road);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

// Road with dashes (center line)
function roadWithLine(x, z, w, d, isVertical = true) {
    road(x, z, w, d);
    // Center dashes
    const dashCount = isVertical ? Math.floor(d / 4) : Math.floor(w / 4);
    for (let i = 0; i < dashCount; i++) {
        const dGeo = new THREE.PlaneGeometry(isVertical ? 0.3 : 1.5, isVertical ? 1.5 : 0.3);
        const dash = new THREE.Mesh(dGeo, MAT.white);
        dash.rotation.x = -Math.PI / 2;
        if (isVertical) {
            dash.position.set(x, 0.07, z - d / 2 + i * 4 + 2);
        } else {
            dash.position.set(x - w / 2 + i * 4 + 2, 0.07, z);
        }
        scene.add(dash);
    }
}

// Tree
function tree(x, z, scale = 1) {
    const trunkGeo = new THREE.CylinderGeometry(0.15 * scale, 0.25 * scale, 2 * scale, 6);
    const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 }));
    trunk.position.set(x, scale, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const canopyGeo = new THREE.SphereGeometry(1.5 * scale, 8, 6);
    const green = 0x2e7d32 + Math.floor(Math.random() * 0x1a3a1a);
    const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshStandardMaterial({ color: green, roughness: 0.8 }));
    canopy.position.set(x, 2.5 * scale + scale * 0.5, z);
    canopy.castShadow = true;
    scene.add(canopy);
}

// Row of trees
function treeRow(x1, z1, x2, z2, count, scaleMin = 0.7, scaleMax = 1.2) {
    for (let i = 0; i < count; i++) {
        const t = i / Math.max(count - 1, 1);
        const tx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 1.5;
        const tz = z1 + (z2 - z1) * t + (Math.random() - 0.5) * 1.5;
        tree(tx, tz, scaleMin + Math.random() * (scaleMax - scaleMin));
    }
}

// Fence/Wall
function wall(x1, z1, x2, z2, height = 2, thickness = 0.3) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const geo = new THREE.BoxGeometry(thickness, height, len);
    const mesh = new THREE.Mesh(geo, MAT.concrete);
    mesh.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
    mesh.rotation.y = angle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
}

// Label
function addLabel(id, text, x, y, z) {
    const div = document.createElement('div');
    div.className = 'label3d';
    div.textContent = text;
    const label = new CSS2DObject(div);
    label.position.set(x, y, z);
    scene.add(label);
    if (id) labelById[id] = label;
    return label;
}

// Pillar (for gate)
function pillar(x, z, w, d, h, mat) {
    // Tapered pillar (pyramid-like)
    const geo = new THREE.CylinderGeometry(w * 0.3, w * 0.5, h, 4);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.rotation.y = Math.PI / 4;
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
}

// =====================================================================
// VISITING FACULTY BUILDING — Detailed model (square courtyard + tensile roof)
// Adapted from standalone visitingfaculty.html
// =====================================================================
function createVisitingFacultyBuilding(cx, cz) {
    const id = 'visiting_faculty';
    const buildingGroup = new THREE.Group();

    // Scale: the HTML model is 100 units wide; campus scale ~15 units
    const S = 0.15;
    const size = 100 * S;       // 15
    const height = 40 * S;      // 6
    const wallDepth = 15 * S;   // 2.25

    // Materials (reuse campus palette where possible)
    const wallMaterial = MAT.concreteW;
    const windowMaterial = MAT.glass;
    const redAccentMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
    const roofMaterial = MAT.roofDark;

    function createWing() {
        const wingGroup = new THREE.Group();

        // Main wall block
        const wallGeo = new THREE.BoxGeometry(size, height, wallDepth);
        const wall = new THREE.Mesh(wallGeo, wallMaterial);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.userData.id = id;
        wingGroup.add(wall);

        // Windows & red accent grid
        const cols = 12;
        const rows = 6;
        const stepX = (size - 10 * S) / cols;
        const stepY = (height - 10 * S) / rows;
        const startX = -size / 2 + 5 * S;
        const startY = -height / 2 + 5 * S;

        for (let i = 0; i < cols; i++) {
            const isRedPanel = (i % 4 === 2) || (i % 4 === 3 && i % 7 < 3);
            for (let j = 0; j < rows; j++) {
                const x = startX + i * stepX + stepX / 2;
                const y = startY + j * stepY + stepY / 2;
                const z = wallDepth / 2 + 0.05;

                if (isRedPanel) {
                    const panelH = stepY + 1 * S;
                    const panelGeo = new THREE.BoxGeometry(stepX * 0.8, panelH, 0.15);
                    const panel = new THREE.Mesh(panelGeo, redAccentMaterial);
                    panel.position.set(x, y, z);
                    wingGroup.add(panel);
                } else {
                    const winGeo = new THREE.BoxGeometry(stepX * 0.6, stepY * 0.6, 0.08);
                    const win = new THREE.Mesh(winGeo, windowMaterial);
                    win.position.set(x, y, z);
                    wingGroup.add(win);
                }
            }
        }

        // Roof cap for wing
        const roofGeo = new THREE.BoxGeometry(size + 2 * S, 2 * S, wallDepth + 2 * S);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        roof.position.y = height / 2 + 1 * S;
        roof.castShadow = true;
        wingGroup.add(roof);

        return wingGroup;
    }

    // Assemble 4 sides to form a hollow square
    const offset = (size - wallDepth) / 2;

    const front = createWing();
    front.position.z = offset;
    buildingGroup.add(front);

    const back = createWing();
    back.rotation.y = Math.PI;
    back.position.z = -offset;
    buildingGroup.add(back);

    const left = createWing();
    left.rotation.y = -Math.PI / 2;
    left.position.x = -offset;
    buildingGroup.add(left);

    const right = createWing();
    right.rotation.y = Math.PI / 2;
    right.position.x = offset;
    buildingGroup.add(right);

    // Central tensile / cone roof structure
    const innerSize = size * 0.6;

    // Fabric cone
    const fabricGeo = new THREE.ConeGeometry(innerSize / 1.5, 15 * S, 16, 4, true);
    const fabricMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9
    });
    const fabric = new THREE.Mesh(fabricGeo, fabricMat);
    fabric.position.y = height / 2 - 5 * S;
    fabric.rotation.y = Math.PI / 4;
    fabric.castShadow = true;
    buildingGroup.add(fabric);

    // Wire frame overlay (cables)
    const wireframeGeo = new THREE.WireframeGeometry(fabricGeo);
    const wireframeMat = new THREE.LineBasicMaterial({ color: 0x8B4513 });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    wireframe.position.copy(fabric.position);
    wireframe.rotation.copy(fabric.rotation);
    buildingGroup.add(wireframe);

    // Central cap ring
    const capGeo = new THREE.CylinderGeometry(2 * S, 2 * S, 1 * S, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, height / 2 + 2.5 * S, 0);
    buildingGroup.add(cap);

    // Corner anchor cables
    const cableMat = new THREE.LineBasicMaterial({ color: 0x555555 });
    const corners = [
        new THREE.Vector3(-innerSize / 2, height / 2, -innerSize / 2),
        new THREE.Vector3( innerSize / 2, height / 2, -innerSize / 2),
        new THREE.Vector3( innerSize / 2, height / 2,  innerSize / 2),
        new THREE.Vector3(-innerSize / 2, height / 2,  innerSize / 2),
    ];
    const topPoint = new THREE.Vector3(0, height / 2 + 2.5 * S, 0);
    corners.forEach(corner => {
        const points = [topPoint, corner];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, cableMat);
        buildingGroup.add(line);
    });

    // Position the whole group in campus coordinates
    buildingGroup.position.set(cx, height / 2, cz);
    scene.add(buildingGroup);

    // Register meshes for raycasting (collect all Mesh children)
    buildingGroup.traverse((child) => {
        if (child.isMesh) {
            child.userData.id = id;
            allMeshes.push(child);
            if (!meshById[id]) meshById[id] = [];
            meshById[id].push(child);
        }
    });

    // Add label
    addLabel(id, '🏢 Visiting Faculty', cx, height + 3, cz);
}

// =====================================================================
// HOSTEL BLOCK — Single wing with hostel.html visual style
// Green balconies, pale yellow walls, window panels, room dividers
// =====================================================================
function createHostelBlock(id, cx, cz, w, d, h, labelText) {
    const buildingGroup = new THREE.Group();
    const floorCount = 5;
    const floorHeight = h / floorCount;

    // Materials (matching hostel.html palette)
    const wallMat = MAT.hostel;
    const wallMatAlt = MAT.hostelAlt;
    const roofMat = MAT.roof;
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0x3e5f3e, roughness: 0.8 });
    const windowMat = MAT.glass;

    // Core wall block
    const coreGeo = new THREE.BoxGeometry(w - 0.5, h, d - 0.5);
    const core = new THREE.Mesh(coreGeo, wallMat);
    core.position.y = h / 2;
    core.castShadow = true;
    core.receiveShadow = true;
    buildingGroup.add(core);

    // Roof slab
    const roofGeo = new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + 0.2;
    roof.receiveShadow = true;
    buildingGroup.add(roof);

    // Floor-by-floor facade details
    for (let i = 1; i <= floorCount; i++) {
        const yPos = i * floorHeight - floorHeight / 2;

        // Green balcony slab
        const slabGeo = new THREE.BoxGeometry(w, 0.3, d);
        const slab = new THREE.Mesh(slabGeo, balconyMat);
        slab.position.y = i * floorHeight;
        slab.castShadow = true;
        buildingGroup.add(slab);

        // Room divider columns + windows along Z-faces (left/right sides)
        const roomWidth = Math.max(2, d / Math.floor(d / 2.5));
        const stepsZ = Math.max(1, Math.floor(d / roomWidth));
        for (let k = 0; k <= stepsZ; k++) {
            const divZ = -d / 2 + k * (d / stepsZ);
            // Left column
            const pL = new THREE.Mesh(new THREE.BoxGeometry(0.3, floorHeight, 0.3), wallMatAlt);
            pL.position.set(-w / 2, yPos, divZ);
            buildingGroup.add(pL);
            // Right column
            const pR = new THREE.Mesh(new THREE.BoxGeometry(0.3, floorHeight, 0.3), wallMatAlt);
            pR.position.set(w / 2, yPos, divZ);
            buildingGroup.add(pR);
            // Windows between columns
            if (k < stepsZ) {
                const winD = (d / stepsZ) - 0.6;
                if (winD > 0) {
                    const winGeo = new THREE.BoxGeometry(0.15, floorHeight * 0.6, winD);
                    const wL = new THREE.Mesh(winGeo, windowMat);
                    wL.position.set(-w / 2 + 0.15, yPos, divZ + (d / stepsZ) / 2);
                    buildingGroup.add(wL);
                    const wR = new THREE.Mesh(winGeo, windowMat);
                    wR.position.set(w / 2 - 0.15, yPos, divZ + (d / stepsZ) / 2);
                    buildingGroup.add(wR);
                }
            }
        }

        // Room divider columns + windows along X-faces (front/back sides)
        const roomWidthX = Math.max(2, w / Math.floor(w / 2.5));
        const stepsX = Math.max(1, Math.floor(w / roomWidthX));
        for (let k = 0; k <= stepsX; k++) {
            const divX = -w / 2 + k * (w / stepsX);
            const pF = new THREE.Mesh(new THREE.BoxGeometry(0.3, floorHeight, 0.3), wallMatAlt);
            pF.position.set(divX, yPos, -d / 2);
            buildingGroup.add(pF);
            const pB = new THREE.Mesh(new THREE.BoxGeometry(0.3, floorHeight, 0.3), wallMatAlt);
            pB.position.set(divX, yPos, d / 2);
            buildingGroup.add(pB);
            if (k < stepsX) {
                const winW = (w / stepsX) - 0.6;
                if (winW > 0) {
                    const winGeo = new THREE.BoxGeometry(winW, floorHeight * 0.6, 0.15);
                    const wF = new THREE.Mesh(winGeo, windowMat);
                    wF.position.set(divX + (w / stepsX) / 2, yPos, -d / 2 + 0.15);
                    buildingGroup.add(wF);
                    const wB = new THREE.Mesh(winGeo, windowMat);
                    wB.position.set(divX + (w / stepsX) / 2, yPos, d / 2 - 0.15);
                    buildingGroup.add(wB);
                }
            }
        }
    }

    // Water tank on roof
    const tankGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const tankMat2 = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const tank = new THREE.Mesh(tankGeo, tankMat2);
    tank.position.set(0, h + 0.9, 0);
    tank.castShadow = true;
    buildingGroup.add(tank);

    // Position on campus
    buildingGroup.position.set(cx, 0, cz);
    scene.add(buildingGroup);

    // Register for raycasting
    buildingGroup.traverse((child) => {
        if (child.isMesh) {
            child.userData.id = id;
            allMeshes.push(child);
            if (!meshById[id]) meshById[id] = [];
            meshById[id].push(child);
        }
    });

    addLabel(id, labelText, cx, h + 2, cz);
}

// =====================================================================
// HOSTEL BUILDING — Detailed model (multi-wing with balconies, dome, tanks)
// Adapted from standalone hostel.html
// =====================================================================
function createHostelBuilding(id, cx, cz, fitW, fitD, labelText) {
    const buildingGroup = new THREE.Group();

    // The original hostel model spans roughly 170 (x: -82..88) by 280 (z: -105..175).
    // We scale to fit the requested footprint (fitW x fitD).
    const origW = 170;
    const origD = 280;
    const sx = fitW / origW;
    const sz = fitD / origD;
    const S = Math.min(sx, sz); // uniform scale to preserve proportions

    const buildingHeight = 25 * S;
    const floorCount = 5;
    const floorHeight = buildingHeight / floorCount;

    // Materials
    const wallMat = MAT.hostel;
    const wallMatAlt = MAT.hostelAlt;
    const roofMat = MAT.roof;
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0x3e5f3e, roughness: 0.8 });
    const railingMat = new THREE.MeshStandardMaterial({ color: 0x2f4f2f, metalness: 0.1 });
    const windowMat = MAT.glass;
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xffffee, roughness: 0.4 });

    function createDetailedBlock(x, z, width, depth, hasCourtyard) {
        const group = new THREE.Group();
        group.position.set(x * S, 0, z * S);

        const w = width * S;
        const d = depth * S;
        const coreW = w - 2 * S;
        const coreD = d - 2 * S;

        // Core structure
        const coreGeo = new THREE.BoxGeometry(coreW, buildingHeight, coreD);
        const core = new THREE.Mesh(coreGeo, wallMat);
        core.position.y = buildingHeight / 2;
        core.castShadow = true;
        core.receiveShadow = true;
        group.add(core);

        // Roof slab
        const roofGeo = new THREE.BoxGeometry(w, 1 * S, d);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = buildingHeight + 0.5 * S;
        roof.receiveShadow = true;
        group.add(roof);

        // Floor slabs (green balcony strips) and window details
        for (let i = 1; i <= floorCount; i++) {
            const yPos = i * floorHeight - floorHeight / 2;

            // Balcony slab
            const slabGeo = new THREE.BoxGeometry(w, 0.5 * S, d);
            const slab = new THREE.Mesh(slabGeo, balconyMat);
            slab.position.y = i * floorHeight;
            slab.castShadow = true;
            group.add(slab);

            // Room dividers and windows on the longer sides
            const roomWidth = 10 * S;
            const stepsZ = Math.max(1, Math.floor(d / roomWidth));

            for (let k = 0; k <= stepsZ; k++) {
                const divZ = -d / 2 + k * (d / stepsZ);

                // Left column
                const pL = new THREE.Mesh(new THREE.BoxGeometry(1 * S, floorHeight, 1 * S), wallMatAlt);
                pL.position.set(-w / 2, yPos - floorHeight / 2, divZ);
                group.add(pL);

                // Right column
                const pR = new THREE.Mesh(new THREE.BoxGeometry(1 * S, floorHeight, 1 * S), wallMatAlt);
                pR.position.set(w / 2, yPos - floorHeight / 2, divZ);
                group.add(pR);

                // Windows between columns
                if (k < stepsZ) {
                    const winH = floorHeight * 0.6;
                    const winD = (d / stepsZ) - 2 * S;
                    if (winD > 0) {
                        const winGeo = new THREE.BoxGeometry(0.5 * S, winH, winD);

                        const wL = new THREE.Mesh(winGeo, windowMat);
                        wL.position.set(-w / 2 + 0.5 * S, yPos - floorHeight / 2, divZ + (d / stepsZ) / 2);
                        group.add(wL);

                        const wR = new THREE.Mesh(winGeo, windowMat);
                        wR.position.set(w / 2 - 0.5 * S, yPos - floorHeight / 2, divZ + (d / stepsZ) / 2);
                        group.add(wR);
                    }
                }
            }
        }

        // Courtyard square on roof
        if (hasCourtyard) {
            const cyGeo = new THREE.PlaneGeometry(w * 0.4, d * 0.4);
            const cyMat = new THREE.MeshStandardMaterial({ color: 0x3b4d3b });
            const cy = new THREE.Mesh(cyGeo, cyMat);
            cy.rotation.x = -Math.PI / 2;
            cy.position.y = buildingHeight + 0.6 * S;
            group.add(cy);
        }

        buildingGroup.add(group);
    }

    // Recreate the hostel wings from hostel.html (original coordinates)
    const wingW = 32;

    // Top wings
    createDetailedBlock(-40, -70, wingW, 70, true);
    createDetailedBlock(40, -70, wingW, 70, true);

    // Central connector
    createDetailedBlock(0, -15, 60, 35, false);

    // Middle wings
    createDetailedBlock(-40, 25, wingW, 45, false);
    createDetailedBlock(40, 25, wingW, 45, false);

    // Stepped connectors
    createDetailedBlock(-54, 55, 28, wingW, false);
    createDetailedBlock(54, 55, 28, wingW, false);

    // Bottom wings (long)
    createDetailedBlock(-68, 115, wingW, 110, true);
    createDetailedBlock(68, 115, wingW, 110, true);

    // Central dome
    const domeGeo = new THREE.SphereGeometry(22 * S, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.scale.set(1.3, 0.6, 2.0);
    dome.position.set(0, buildingHeight + 0.2 * S, -15 * S);
    dome.castShadow = true;
    buildingGroup.add(dome);

    // Water tanks on roof
    for (let i = 0; i < 6; i++) {
        const tankGeo = new THREE.CylinderGeometry(2 * S, 2 * S, 4 * S, 16);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set((-15 + i * 6) * S, buildingHeight + 2 * S, 10 * S);
        tank.castShadow = true;
        buildingGroup.add(tank);
    }

    // Position group in campus world
    buildingGroup.position.set(cx, 0, cz);
    scene.add(buildingGroup);

    // Register all meshes for raycasting
    buildingGroup.traverse((child) => {
        if (child.isMesh) {
            child.userData.id = id;
            allMeshes.push(child);
            if (!meshById[id]) meshById[id] = [];
            meshById[id].push(child);
        }
    });

    // Add label
    addLabel(id, labelText, cx, buildingHeight + 4, cz);
}

// =====================================================================
// 6. BUILD THE GROUND / TERRAIN
// =====================================================================
function buildTerrain() {
    // Main campus ground (grass) — expanded for road-network-aligned positions
    ground(0, -20, 500, 300, MAT.grass);

    // Outer terrain
    ground(0, -20, 1000, 600, MAT.grassDark);
    const outerGeo = new THREE.PlaneGeometry(1000, 600);
    const outerMesh = new THREE.Mesh(outerGeo, MAT.grassDark);
    outerMesh.rotation.x = -Math.PI / 2;
    outerMesh.position.set(0, -0.05, -20);
    outerMesh.receiveShadow = true;
    scene.add(outerMesh);

    // Sandy/bare areas around construction zones
    ground(-180, -60, 45, 40, MAT.sand);
    ground(165, -50, 60, 30, MAT.dirt);
    ground(150, 60, 75, 30, MAT.sand);
    ground(-150, 50, 45, 25, MAT.dirt);
}

// =====================================================================
// 7. BUILD ROAD NETWORK — from real GeoJSON / OSM data
// =====================================================================

// ── Geo→World coordinate conversion ──────────────────────────────────
// Calibrated against known building positions:
//   Main gate  (lat 30.9607, lon 76.47333) → world (0, 87)
//   Khorana Blk (lat 30.9715, lon 76.4810) → world (72, -84)
//   Ramanujan  (lat 30.9715, lon 76.4680) → world (-50, -84)
const GEO_CENTER_LAT = 30.96620;
const GEO_CENTER_LON = 76.47333;
const GEO_DEG_LAT_M  = 111139;                                            // m per degree latitude
const GEO_DEG_LON_M  = 111139 * Math.cos(GEO_CENTER_LAT * Math.PI / 180); // m per degree longitude (~95299)
const GEO_SCALE_X    = 0.22161;                                           // world units per meter (E-W) — 1.5× horizontal stretch
const GEO_SCALE_Z    = 0.21360;                                           // world units per meter (N-S) — 1.5× original

function geoToWorld(lon, lat) {
    return {
        x:  (lon - GEO_CENTER_LON) * GEO_DEG_LON_M * GEO_SCALE_X,
        z: -(lat - GEO_CENTER_LAT) * GEO_DEG_LAT_M * GEO_SCALE_Z
    };
}

// ── Road ribbon mesh from polyline ───────────────────────────────────
// Creates a flat ribbon (triangle strip) following a series of world-space points.
function createRoadRibbon(points, width, material, yPos) {
    if (points.length < 2) return null;

    const verts = [];
    const uvs   = [];
    const idx   = [];
    let cumLen  = 0;

    for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Tangent direction (averaged at interior vertices for smooth corners)
        let dx, dz;
        if (i === 0) {
            dx = points[1].x - p.x;
            dz = points[1].z - p.z;
        } else if (i === points.length - 1) {
            dx = p.x - points[i - 1].x;
            dz = p.z - points[i - 1].z;
        } else {
            dx = points[i + 1].x - points[i - 1].x;
            dz = points[i + 1].z - points[i - 1].z;
        }
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        // Perpendicular (left-hand normal in XZ plane)
        const nx = -dz / len;
        const nz =  dx / len;

        const hw = width / 2;
        verts.push(
            p.x + nx * hw, yPos, p.z + nz * hw,
            p.x - nx * hw, yPos, p.z - nz * hw
        );

        if (i > 0) {
            const segDx = p.x - points[i - 1].x;
            const segDz = p.z - points[i - 1].z;
            cumLen += Math.sqrt(segDx * segDx + segDz * segDz);
        }
        uvs.push(0, cumLen / width, 1, cumLen / width);
    }

    // Build triangle indices (CCW winding so normals face upward)
    const vertCount = verts.length / 3;
    for (let i = 0; i < vertCount / 2 - 1; i++) {
        const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
        idx.push(a, c, b,  b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

// ── Center-line dashes along a polyline ──────────────────────────────
function createRoadDashes(points, yPos) {
    const dashLen = 1.5, gapLen = 2.5, dashW = 0.3;
    let dist = 0;
    let inDash = true;
    let remaining = dashLen;

    for (let i = 1; i < points.length; i++) {
        const sx = points[i].x - points[i - 1].x;
        const sz = points[i].z - points[i - 1].z;
        const segLen = Math.sqrt(sx * sx + sz * sz);
        if (segLen === 0) continue;
        const ux = sx / segLen, uz = sz / segLen;
        let walked = 0;

        while (walked < segLen) {
            const step = Math.min(remaining, segLen - walked);
            if (inDash) {
                const cx = points[i - 1].x + ux * (walked + step / 2);
                const cz = points[i - 1].z + uz * (walked + step / 2);
                const angle = Math.atan2(ux, uz);
                const geo = new THREE.PlaneGeometry(dashW, step);
                const dash = new THREE.Mesh(geo, MAT.white);
                dash.rotation.x = -Math.PI / 2;
                dash.rotation.z = -angle;
                dash.position.set(cx, yPos, cz);
                scene.add(dash);
            }
            walked += step;
            remaining -= step;
            if (remaining <= 0) {
                inDash = !inDash;
                remaining = inDash ? dashLen : gapLen;
            }
        }
    }
}

// ── Road style config ────────────────────────────────────────────────
const ROAD_MAT = {
    tertiary:     MAT.road,
    service:      MAT.road,
    path:         MAT.sidewalk,
    track:        MAT.roadLight,
    raceway:      new THREE.MeshStandardMaterial({ color: 0xc06030, roughness: 0.85, metalness: 0 }),
    unclassified: MAT.roadLight
};

const ROAD_WIDTH = {
    tertiary: 4, service: 2.5, path: 1.5, track: 2, raceway: 2.5, unclassified: 2.5
};

const ROAD_Y = {
    tertiary: 0.08, service: 0.06, path: 0.05, track: 0.06, raceway: 0.07, unclassified: 0.06
};

// ── Inline road network (92 features from map_roads_only.geojson) ────
const ROAD_NETWORK = [
  {t:"tertiary",n:"IIT Ropar (Main Campus) Road",c:[[76.5198725,30.9822351],[76.5171891,30.9807331],[76.5162724,30.9800779],[76.5157224,30.9797212],[76.5140152,30.977749],[76.5138831,30.9776005],[76.5121067,30.9764499],[76.5118705,30.9762318],[76.5112709,30.9752971],[76.5107803,30.9748454],[76.5102534,30.9745806],[76.5081458,30.9741288],[76.5068921,30.9739886],[76.5056021,30.9739418],[76.50473,30.9740509],[76.5028404,30.9745182],[76.5017139,30.9746584],[76.5000822,30.9747825],[76.4990522,30.9747866],[76.4985809,30.9747652],[76.4961337,30.9746702],[76.4948854,30.9743621],[76.4934479,30.9736485],[76.4889997,30.9716252],[76.4869223,30.9708429],[76.486634,30.9707766],[76.4862982,30.9707456],[76.4855987,30.9707352],[76.4849174,30.970778],[76.4843997,30.9709031],[76.4840284,30.9710375],[76.482549,30.9716758],[76.4819416,30.971858],[76.4814037,30.9719886],[76.4809638,30.9720461],[76.4807573,30.9720921],[76.4803871,30.9721381],[76.4798266,30.9721381],[76.4788127,30.9720806],[76.4763491,30.9719277],[76.4751193,30.9719484],[76.4738737,30.9718744],[76.4724058,30.9717871]]},
  {t:"service",n:null,c:[[76.4731211,30.9709765],[76.4733283,30.9709765],[76.4739123,30.9709765],[76.4739561,30.9709534],[76.4739999,30.9708957],[76.4740327,30.9696363]]},
  {t:"service",n:null,c:[[76.4731211,30.9709765],[76.472937,30.9709731],[76.4724055,30.9709631],[76.4723042,30.9709161],[76.4722892,30.97087],[76.4723047,30.969613]]},
  {t:"service",n:null,c:[[76.4723047,30.969613],[76.4740327,30.9696363]]},
  {t:"service",n:null,c:[[76.4723047,30.969613],[76.4723083,30.9692689],[76.4723089,30.9692111],[76.4723089,30.9691136],[76.4723189,30.9690838],[76.4723521,30.9690467],[76.4723903,30.9690254],[76.4724351,30.969014],[76.4725381,30.969014],[76.4731446,30.9690214],[76.4738955,30.9690306],[76.4739808,30.9690439],[76.4740312,30.9691005],[76.474039,30.9691902],[76.4740327,30.9696363]]},
  {t:"service",n:null,c:[[76.4651665,30.9692521],[76.4652801,30.9692533],[76.4656374,30.9692571],[76.4657936,30.9692588],[76.4668369,30.9692529],[76.4670203,30.9693342],[76.4673234,30.969465],[76.4674295,30.9694793],[76.4675539,30.9695052],[76.4678628,30.9695178],[76.4683034,30.9695126],[76.4684381,30.9695146],[76.4685779,30.9695167],[76.4689367,30.9695221],[76.4693499,30.9695284],[76.4697235,30.9695287],[76.4723047,30.969613]]},
  {t:"service",n:null,c:[[76.4693499,30.9695284],[76.4693799,30.9682059]]},
  {t:"service",n:null,c:[[76.4696371,30.9681769],[76.470031,30.9681798],[76.4700647,30.9681481],[76.4700849,30.968099],[76.470088,30.9679273],[76.47013,30.9673489]]},
  {t:"service",n:null,c:[[76.470088,30.9679273],[76.4715686,30.9679677]]},
  {t:"service",n:null,c:[[76.4740327,30.9696363],[76.4751434,30.9696555],[76.4768261,30.9696775],[76.4774254,30.9696801],[76.4778605,30.969682],[76.4778913,30.9696511],[76.4779016,30.9696025],[76.4778347,30.969479],[76.477737,30.969276],[76.4776752,30.9690819],[76.4776542,30.9689349],[76.4776443,30.9688657],[76.4776362,30.968625],[76.4776443,30.968548],[76.4776705,30.9683848],[76.4776879,30.9682764],[76.4776906,30.9682594],[76.477769,30.9680976],[76.4778039,30.9680256],[76.4778707,30.9678667],[76.4778685,30.9677939],[76.4778094,30.9677317],[76.4776565,30.9675759],[76.477601,30.9675431],[76.4775321,30.96753],[76.4772747,30.9675258],[76.4764803,30.9675248]]},
  {t:"service",n:null,c:[[76.4774254,30.9696801],[76.4774224,30.9699154],[76.4774186,30.9702138],[76.4774144,30.9705474],[76.4774104,30.9708655],[76.4774063,30.9711848],[76.4774291,30.9711948],[76.4784375,30.9712064],[76.4784662,30.9711833],[76.4784727,30.9708758],[76.4784794,30.9705648],[76.4784866,30.9702289],[76.478493,30.9699308]]},
  {t:"service",n:null,c:[[76.4774186,30.9702138],[76.4784866,30.9702289]]},
  {t:"service",n:null,c:[[76.4774144,30.9705474],[76.4784794,30.9705648]]},
  {t:"service",n:null,c:[[76.4774104,30.9708655],[76.4784727,30.9708758]]},
  {t:"service",n:null,c:[[76.4784866,30.9702289],[76.4792013,30.9702449],[76.4792459,30.9702028],[76.4792549,30.9699423],[76.478493,30.9699308],[76.4774224,30.9699154]]},
  {t:"service",n:null,c:[[76.4710521,30.9690798],[76.4710561,30.9688724],[76.4710676,30.9682812],[76.4710985,30.9682657],[76.4716253,30.9682657],[76.4716645,30.9682657],[76.4718102,30.9682669],[76.4722079,30.9682701],[76.4722388,30.9682922],[76.4722385,30.9683162],[76.4722367,30.9684457],[76.4722322,30.9688009],[76.472231,30.968879],[76.4722027,30.9688945],[76.4715878,30.9688812],[76.4710561,30.9688724]]},
  {t:"service",n:null,c:[[76.4722367,30.9684457],[76.4731628,30.9684521],[76.4741773,30.9684591],[76.4741697,30.9688325],[76.4741682,30.9689052],[76.4743819,30.9689085],[76.4746578,30.9689128],[76.4752269,30.9689204],[76.4752298,30.9691517],[76.4756847,30.9691585],[76.4760807,30.9691644],[76.4760777,30.9690195],[76.4760836,30.9686434],[76.4760836,30.9685824],[76.4760407,30.9685816],[76.4759558,30.9685801],[76.4752419,30.9685672],[76.4752269,30.9689204]]},
  {t:"service",n:null,c:[[76.4723083,30.9692689],[76.4717773,30.9692642],[76.4711475,30.9692587],[76.4702808,30.969251]]},
  {t:"service",n:null,c:[[76.4711475,30.9692587],[76.471156,30.9690342],[76.4711813,30.9690024],[76.4712099,30.9689923],[76.471752,30.969001],[76.4717772,30.9690298],[76.4717773,30.9692642]]},
  {t:"service",n:null,c:[[76.4697235,30.9695287],[76.4696763,30.9702359]]},
  {t:"service",n:null,c:[[76.466681,30.9664748],[76.4690069,30.9664903],[76.4692566,30.966491],[76.4704842,30.9664947],[76.4705904,30.9664605],[76.4707131,30.9664953],[76.4720239,30.9665191],[76.4721406,30.9665238],[76.4725716,30.9665274],[76.4728248,30.966531],[76.473513,30.9665407],[76.4743177,30.9665521],[76.4753953,30.9665725],[76.4759893,30.9665838],[76.4766818,30.9665969],[76.4772816,30.9666083],[76.4773075,30.9666088],[76.4779101,30.9666153],[76.4786739,30.9666236],[76.4789875,30.9666277],[76.4795072,30.9666346],[76.4797537,30.9666397]]},
  {t:"service",n:null,c:[[76.4759893,30.9665838],[76.4759967,30.9663265],[76.4760057,30.9660097],[76.4760151,30.9656809],[76.4760283,30.9652222],[76.476038,30.9648825],[76.4760556,30.964266],[76.4760651,30.9639342]]},
  {t:"service",n:null,c:[[76.4762301,30.9639701],[76.4762735,30.96213],[76.4762891,30.9610507],[76.4762891,30.9605765],[76.4762713,30.9604621],[76.4762189,30.9603507],[76.4761569,30.9602543],[76.4760871,30.9601977],[76.4760231,30.9601595],[76.4759436,30.9601312],[76.4758427,30.9601063],[76.4757613,30.9600963],[76.4752998,30.9600896],[76.474411,30.9600892],[76.4742233,30.9601389],[76.4740799,30.9601916],[76.4738955,30.9602824],[76.4737624,30.9603936],[76.4736676,30.9604742],[76.4728267,30.961435],[76.4719255,30.9623332],[76.4717185,30.9625143],[76.471379,30.9627166],[76.4709667,30.9629718],[76.4704148,30.963313],[76.4703397,30.9634155],[76.4703226,30.9635062],[76.4703152,30.9638994]]},
  {t:"service",n:null,c:[[76.4707131,30.9664953],[76.4707042,30.9667962],[76.4706952,30.9670375],[76.4706952,30.9671237],[76.4707086,30.9671448],[76.4707399,30.9671505],[76.4712281,30.9671616],[76.4718395,30.9671755],[76.4720663,30.9671806],[76.4721167,30.9671628],[76.4721316,30.9671298],[76.4721406,30.9665238]]},
  {t:"service",n:null,c:[[76.4692566,30.966491],[76.4692415,30.9673265],[76.47013,30.9673489],[76.4701844,30.9673498],[76.4704488,30.9673569],[76.4704828,30.9665279],[76.4704842,30.9664947]]},
  {t:"service",n:null,c:[[76.4772747,30.9675258],[76.4772816,30.9666083]]},
  {t:"service",n:null,c:[[76.4764604,30.9683793],[76.4776705,30.9683848]]},
  {t:"service",n:null,c:[[76.4764554,30.9686068],[76.4776362,30.968625]]},
  {t:"service",n:null,c:[[76.4764492,30.9689369],[76.4776542,30.9689349]]},
  {t:"service",n:null,c:[[76.4764492,30.9689369],[76.4764554,30.9686068],[76.4764399,30.9684439],[76.4764604,30.9683793],[76.476464,30.9682237],[76.4764642,30.9682169],[76.4764672,30.9680852],[76.4764744,30.967778],[76.4764803,30.9675248]]},
  {t:"service",n:null,c:[[76.4764744,30.967778],[76.4778685,30.9677939]]},
  {t:"service",n:null,c:[[76.4764672,30.9680852],[76.4774046,30.9680958],[76.477769,30.9680976]]},
  {t:"service",n:null,c:[[76.4718395,30.9671755],[76.4718196,30.967378],[76.4717813,30.9674405],[76.4716038,30.9676303],[76.4714803,30.9678399],[76.4714931,30.9678752],[76.4715686,30.9679677]]},
  {t:"service",n:null,c:[[76.4715686,30.9679677],[76.4716253,30.9682657]]},
  {t:"service",n:null,c:[[76.4718196,30.967378],[76.4721014,30.9673901],[76.4724601,30.96762],[76.4721475,30.9679493],[76.4718415,30.9681332],[76.4718281,30.9681638],[76.4718102,30.9682669]]},
  {t:"service",n:null,c:[[76.4724058,30.9717871],[76.4724599,30.9716589],[76.4725192,30.9715853],[76.4725933,30.9715217],[76.4726792,30.9714684],[76.4728155,30.9714023],[76.4728926,30.971354],[76.4729282,30.9712879],[76.4729324,30.9711365],[76.472937,30.9709731]]},
  {t:"service",n:null,c:[[76.4738737,30.9718744],[76.4737936,30.9716589],[76.4737165,30.97157],[76.4735802,30.9714709],[76.4734202,30.9713947],[76.4733673,30.9713591],[76.4733372,30.9713388],[76.4733194,30.9713006],[76.4733216,30.9712209],[76.4733283,30.9709765]]},
  {t:"service",n:null,c:[[76.4728926,30.971354],[76.4733673,30.9713591]]},
  {t:"path",n:null,c:[[76.4722121,30.9696494],[76.4721986,30.9696898],[76.4722239,30.969723],[76.4722222,30.9699078],[76.4722138,30.9702281],[76.472207,30.9705349],[76.4721986,30.9708705],[76.4722138,30.9709124],[76.4722508,30.9709586],[76.4722845,30.970986],[76.4723265,30.9710091],[76.4723737,30.9710206],[76.4725336,30.9710264],[76.4726464,30.9710264],[76.4728114,30.9710264],[76.4728568,30.9710452],[76.4728669,30.9710596],[76.4728669,30.9711159],[76.4728669,30.9711318],[76.4729006,30.9711347],[76.4729324,30.9711365]]},
  {t:"path",n:null,c:[[76.4733216,30.9712209],[76.4733926,30.9712209],[76.4733926,30.9712741],[76.4734072,30.9713041],[76.4734452,30.9713267],[76.4736162,30.9714081],[76.4737156,30.971474],[76.4738179,30.9715742],[76.473888,30.9716782],[76.4739407,30.9717785]]},
  {t:"path",n:null,c:[[76.4723827,30.9696797],[76.4723671,30.9701842],[76.4723654,30.9704116],[76.4723619,30.9706357],[76.4723619,30.9708672],[76.4723671,30.9708831],[76.472395,30.9708929],[76.4727313,30.9708944],[76.4733669,30.9709054],[76.4737204,30.9709088],[76.4738704,30.970911],[76.4739019,30.9709054],[76.4739145,30.9708946],[76.4739198,30.9706653],[76.4739273,30.9702959],[76.4739373,30.9699559],[76.4739373,30.9696636]]},
  {t:"path",n:null,c:[[76.4743819,30.9689085],[76.4743835,30.9690567],[76.4744043,30.9692348],[76.4743887,30.9692511],[76.4740858,30.9692526]]},
  {t:"service",n:null,c:[[76.4797537,30.9666397],[76.4797408,30.966532],[76.4797057,30.9663183],[76.479639,30.9660746],[76.4794355,30.9654034],[76.4793934,30.9653222],[76.4791161,30.9651325],[76.4785989,30.9648896],[76.4785049,30.9648458],[76.4779543,30.964589],[76.4776262,30.9644361],[76.4767945,30.9641474],[76.4767305,30.9641273],[76.4762301,30.9639701]]},
  {t:"path",n:null,c:[[76.4746053,30.9636385],[76.4752254,30.9637192],[76.4755607,30.9637763],[76.4760544,30.9638768],[76.4761738,30.9639063]]},
  {t:"path",n:null,c:[[76.4752552,30.9637645],[76.4752805,30.9636109]]},
  {t:"path",n:null,c:[[76.4754481,30.9619417],[76.4754681,30.9614784]]},
  {t:"path",n:null,c:[[76.4731446,30.9690214],[76.4731512,30.9688158],[76.4731628,30.9684521]]},
  {t:"path",n:null,c:[[76.4722322,30.9688009],[76.4731512,30.9688158],[76.4741697,30.9688325]]},
  {t:"service",n:null,c:[[76.4674295,30.9694793],[76.4675144,30.9693442],[76.4676646,30.9690375],[76.4676917,30.9689595],[76.4677151,30.968859],[76.4677157,30.9688281],[76.4677427,30.9686245],[76.4677367,30.9683823],[76.4677097,30.9682148],[76.4676943,30.9681733],[76.4676736,30.9681177],[76.4675504,30.9678806],[76.4673813,30.967604],[76.4669615,30.9669234],[76.466681,30.9664748]]},
  {t:"raceway",n:null,c:[[76.4734115,30.9613435],[76.4734221,30.961838],[76.4742051,30.9618471],[76.4743268,30.9619061],[76.4746971,30.9622146],[76.474676,30.9631809],[76.4745702,30.9632625],[76.4741469,30.9632308],[76.4741363,30.9631582],[76.473967,30.9631899],[76.4738295,30.9632081],[76.4735279,30.963199],[76.4730042,30.9632625],[76.4728137,30.9631854],[76.4725968,30.9626816],[76.4721259,30.9626953],[76.4721365,30.9623732],[76.472327,30.9623686],[76.472921,30.9617437],[76.4731198,30.9615024],[76.4731047,30.9613731],[76.4732165,30.9613556],[76.4734115,30.9613435]]},
  {t:"service",n:null,c:[[76.4786813,30.9682905],[76.4786625,30.9678627],[76.4786531,30.9672107],[76.4786625,30.9667956],[76.4786739,30.9666236]]},
  {t:"service",n:null,c:[[76.4652801,30.9692533],[76.4652534,30.9690805],[76.4650953,30.9680586],[76.4655458,30.9680626],[76.4663671,30.96807],[76.46687,30.9680745],[76.4669994,30.9680956],[76.4671966,30.9681326],[76.4676428,30.9681691],[76.4676943,30.9681733]]},
  {t:"service",n:null,c:[[76.4652534,30.9690805],[76.4656349,30.9690863],[76.4661599,30.9690933],[76.4665305,30.9691],[76.466756,30.9691034],[76.4668391,30.969177],[76.4668369,30.9692529]]},
  {t:"service",n:null,c:[[76.4656374,30.9692571],[76.4656349,30.9690863]]},
  {t:"service",n:null,c:[[76.4661599,30.9690933],[76.4663215,30.9683169],[76.4663671,30.96807]]},
  {t:"service",n:null,c:[[76.4663215,30.9683169],[76.4664261,30.9684732],[76.4665305,30.9691]]},
  {t:"service",n:null,c:[[76.4668391,30.969177],[76.4671141,30.9691898],[76.4674185,30.969208],[76.4674937,30.9688537],[76.4676428,30.9681691]]},
  {t:"service",n:null,c:[[76.4674937,30.9688537],[76.4677151,30.968859]]},
  {t:"service",n:null,c:[[76.4693799,30.9682059],[76.4691329,30.968201],[76.4680124,30.9681783],[76.467952,30.9681981],[76.4679281,30.968261],[76.4680816,30.9691647],[76.4681136,30.9691976],[76.4681501,30.9692198],[76.4683939,30.9692112],[76.4684252,30.9692581],[76.4684381,30.9695146]]},
  {t:"service",n:null,c:[[76.4685779,30.9695167],[76.4685955,30.9692308],[76.4686236,30.9692059],[76.4688633,30.9692132],[76.4689119,30.9692011],[76.4689448,30.9691728],[76.4691329,30.968201]]},
  {t:"service",n:null,c:[[76.4653462,30.9664338],[76.4655712,30.9664407],[76.466681,30.9664748]]},
  {t:"service",n:null,c:[[76.4655712,30.9664407],[76.4655458,30.9680626]]},
  {t:"service",n:null,c:[[76.466681,30.9664748],[76.4664116,30.9660348],[76.4663869,30.9659358],[76.4663952,30.9658545],[76.4664158,30.9657944],[76.4664694,30.9657273],[76.4664941,30.9656955],[76.46656,30.9656601],[76.4666549,30.9656425],[76.4673598,30.9656531],[76.4674669,30.9656319],[76.4675494,30.9655859],[76.4676153,30.9655081],[76.4676236,30.9654162],[76.4676277,30.9651122],[76.4676442,30.9650309],[76.4676937,30.9649497],[76.4681636,30.9646669],[76.4686954,30.9644124],[76.469223,30.9641968],[76.4697589,30.9640377],[76.4703152,30.9638994],[76.470773,30.963815],[76.4714408,30.9637196],[76.4722611,30.9636418],[76.4730154,30.9636312],[76.4739512,30.9636524],[76.4745942,30.9637019],[76.4755176,30.963815],[76.4760651,30.9639342],[76.4762301,30.9639701]]},
  {t:"service",n:null,c:[[76.4760283,30.9652222],[76.4767047,30.9652328],[76.4779494,30.9652522],[76.4784939,30.9652607],[76.4785049,30.9648458]]},
  {t:"service",n:null,c:[[76.4767305,30.9641273],[76.4767271,30.9642743],[76.4767124,30.9649038],[76.4767047,30.9652328]]},
  {t:"service",n:null,c:[[76.4779543,30.964589],[76.4779494,30.9652522]]},
  {t:"service",n:null,c:[[76.476038,30.9648825],[76.4767124,30.9649038]]},
  {t:"service",n:null,c:[[76.4760556,30.964266],[76.4767271,30.9642743]]},
  {t:"service",n:null,c:[[76.4794355,30.9654034],[76.4807675,30.965424],[76.4811419,30.9652742],[76.4812467,30.9652871]]},
  {t:"service",n:null,c:[[76.4760151,30.9656809],[76.476709,30.9656975],[76.4779357,30.9657267]]},
  {t:"service",n:null,c:[[76.4760057,30.9660097],[76.4766996,30.9660212],[76.4779267,30.9660398]]},
  {t:"service",n:null,c:[[76.4759967,30.9663265],[76.4766899,30.9663357],[76.4779177,30.9663527],[76.4784561,30.9663605],[76.4789941,30.9663681]]},
  {t:"service",n:null,c:[[76.476709,30.9656975],[76.4766996,30.9660212],[76.4766899,30.9663357],[76.4766818,30.9665969]]},
  {t:"service",n:null,c:[[76.4779101,30.9666153],[76.4779177,30.9663527],[76.4779267,30.9660398],[76.477929,30.9659594],[76.4779357,30.9657267],[76.4779494,30.9652522]]},
  {t:"service",n:null,c:[[76.477929,30.9659594],[76.4781327,30.9659624],[76.4782801,30.9659644],[76.4784557,30.9659711],[76.4786829,30.9659694],[76.4788229,30.9659778],[76.4790038,30.9659834],[76.4789941,30.9663681],[76.4789875,30.9666277]]},
  {t:"service",n:null,c:[[76.4784557,30.9659711],[76.4784561,30.9663605]]},
  {t:"service",n:null,c:[[76.473513,30.9665407],[76.4735391,30.967064],[76.4735889,30.9680634],[76.4727622,30.9680465]]},
  {t:"service",n:null,c:[[76.4725716,30.9665274],[76.4726982,30.9666844],[76.4728248,30.966531]]},
  {t:"service",n:null,c:[[76.4726982,30.9666844],[76.4726899,30.9670526],[76.4726771,30.9676168]]},
  {t:"service",n:null,c:[[76.4726899,30.9670526],[76.4735391,30.967064]]},
  {t:"service",n:null,c:[[76.4735889,30.9680634],[76.4753235,30.968093],[76.4753583,30.9680751],[76.4753769,30.9680372],[76.4753953,30.9665725]]},
  {t:"service",n:null,c:[[76.4776879,30.9682764],[76.4786813,30.9682905],[76.4805907,30.9683548],[76.4810389,30.9684769]]},
  {t:"service",n:null,c:[[76.4812467,30.9652871],[76.4811955,30.9657971],[76.4810389,30.9684769]]},
  {t:"service",n:null,c:[[76.4689367,30.9695221],[76.468937,30.9696954],[76.4689382,30.9702427],[76.4692216,30.9702401],[76.4696763,30.9702359]]},
  {t:"service",n:null,c:[[76.4692216,30.9702401],[76.4692375,30.9697076],[76.468937,30.9696954]]},
  {t:"service",n:null,c:[[76.4705904,30.9664605],[76.4705938,30.9657735],[76.4706725,30.9656915],[76.4708861,30.9656951],[76.4718284,30.9657108],[76.4719687,30.9657132],[76.4720446,30.965759],[76.4720239,30.9665191]]},
  {t:"service",n:null,c:[[76.4708861,30.9656951],[76.4709412,30.9659095],[76.4717331,30.9659312],[76.4718284,30.9657108]]},
  {t:"service",n:null,c:[[76.4867813,30.9653168],[76.4866975,30.9653155],[76.4861776,30.9653074],[76.4860971,30.9653061],[76.485307,30.9653028],[76.484584,30.965191],[76.4830191,30.9652173],[76.481389,30.965265],[76.4812467,30.9652871]]},
  {t:"tertiary",n:null,c:[[76.4724058,30.9717871],[76.4720803,30.9717678],[76.4715924,30.9717877],[76.4701234,30.9720682],[76.4685431,30.97251],[76.4678121,30.9726293],[76.4664059,30.9726771],[76.465473,30.9727248],[76.4641711,30.9726234],[76.4634611,30.9724144],[76.4623054,30.9721697],[76.4607251,30.9717877],[76.4603422,30.9717101],[76.4595258,30.9717086],[76.4574747,30.9717017]]},
  {t:"unclassified",n:null,c:[[76.4786614,30.953388],[76.4780593,30.9542469],[76.4772712,30.9553999],[76.4765153,30.9565501],[76.476218,30.9570087],[76.4761165,30.9571652],[76.4756179,30.9578272],[76.4752963,30.9582437],[76.4746272,30.9590822],[76.4736945,30.9601055],[76.47299,30.9608723],[76.4723403,30.961526],[76.471385,30.9623507],[76.4711213,30.9625438],[76.4706323,30.9628362],[76.4697124,30.9633133],[76.4687732,30.9638236],[76.4681267,30.9641656],[76.4671489,30.9646014],[76.4657947,30.965164],[76.4648845,30.9655915],[76.4643344,30.9658921],[76.4631025,30.9664189],[76.4629063,30.9665817],[76.462723,30.9667499],[76.4626683,30.9669705],[76.4626811,30.9672105],[76.4627326,30.9673456],[76.4627776,30.9674753],[76.4627519,30.9675635],[76.4626876,30.9676132],[76.462649,30.9677207],[76.4626393,30.9679083],[76.4625911,30.9680158],[76.4624303,30.9682668],[76.4621794,30.9685647],[76.461758,30.9691411],[76.4616872,30.9692983],[76.4615843,30.9693893],[76.4614524,30.9694803],[76.4613045,30.9695382],[76.4609764,30.9695631],[76.4601594,30.9695934],[76.4599729,30.9696513],[76.4597959,30.9698085],[76.4596351,30.9700126],[76.4595451,30.9702801],[76.4594872,30.9705532],[76.459455,30.9708455],[76.4595161,30.9715433],[76.4595258,30.9717086]]},
  {t:"track",n:null,c:[[76.4725167,30.9578128],[76.4725418,30.9579334],[76.4725263,30.9581023],[76.4724414,30.9583507],[76.472368,30.9586356],[76.4722058,30.9590065],[76.4719393,30.9592682],[76.4718272,30.9593675],[76.4714951,30.959659],[76.4712786,30.9598726]]},
  {t:"unclassified",n:null,c:[[76.4703401,30.9521285],[76.4703554,30.9522169],[76.4703876,30.9526804],[76.4696864,30.9537782],[76.4695513,30.953963],[76.4690752,30.9547299],[76.4685027,30.9556181],[76.4683097,30.9558994],[76.4677307,30.9567821],[76.4673287,30.9574082],[76.4670231,30.9578744],[76.4665052,30.9586853],[76.4662576,30.9590467],[76.4658587,30.9595983],[76.4654245,30.9600231],[76.464971,30.9603292],[76.4644113,30.9606713],[76.4637519,30.9609912],[76.4633659,30.9611788],[76.4618124,30.9618352],[76.4596251,30.9628144],[76.4577563,30.9636225],[76.4564118,30.9642155],[76.4546653,30.9649492],[76.4528446,30.9657542]]}
];

// ── Build all roads from the network data ────────────────────────────
function buildRoads() {
    ROAD_NETWORK.forEach(rd => {
        const hw   = rd.t;
        const mat  = ROAD_MAT[hw]   || MAT.road;
        const w    = ROAD_WIDTH[hw]  || 2.5;
        const y    = ROAD_Y[hw]     || 0.06;

        // Convert geo coordinates to world-space points
        const pts = rd.c.map(c => geoToWorld(c[0], c[1]));

        // Create road ribbon mesh
        createRoadRibbon(pts, w, mat, y);

        // Add center-line dashes for tertiary (main) roads
        if (hw === 'tertiary') {
            createRoadDashes(pts, y + 0.01);
        }
    });

    // Parking areas (kept from original layout) — X coords & widths ×1.5
    ground(-30, 15, 22.5, 8, MAT.parking);
    ground(30, 15, 22.5, 8, MAT.parking);
    ground(-75, -70, 18, 8, MAT.parking);
    ground(75, -70, 18, 8, MAT.parking);
    ground(-1.5, 75, 30, 6, MAT.parking);
}

// =====================================================================
// 8. BUILDING DATABASE — every building from image analysis
// =====================================================================
// Each entry: { id, name, cat, desc, tags, build() }
// build() creates the 3D geometry at exact positions from image analysis.

const CAMPUS_DATA = [];

function reg(id, name, cat, desc, tags) {
    const entry = { id, name, cat, desc, tags };
    CAMPUS_DATA.push(entry);
    return entry;
}

function buildAllBuildings() {

    // =====================================================================
    // Positions aligned to reference map annotations over the 3D campus view.
    // Only buildings labelled in the reference map are active.
    // Campus layout (world coords):
    //   z ≈ -133 : Main entrance road (tertiary)
    //   z ≈ -115 : Spiral structure
    //   z ≈ -65 to -75 : Row 1 — H1-H3, P, D1-D4
    //   z ≈ -35 to -50 : Row 2 — H4-H6, Mess, UT, MC, Workshop, LHC, A, Lib, VF
    //   z ≈ +50 to +90 : Sports — VG, BG, FG, CG
    // =====================================================================

    // =====================================================================
    // M — MAIN GATE  (tertiary road junction at x≈-19.5, z≈-132.6)
    // Tertiary road runs E-W: (11.5,-134.7)→(-19.5,-132.6)→(-26.4,-132.2)
    // Service road enters campus south from (-19.5,-132.6)
    // =====================================================================
    reg('main_gate', 'Main Gate Complex', 'landmark',
        'Iconic entrance inspired by Indus Valley Civilisation with four 41-ft stone-carved pyramid pillars, built with ASI.',
        ['Entrance', 'Indus Valley', 'Iconic']);
    // Gate bar spans the campus entrance (≈12 units wide), centered on the road junction
    box('main_gate', -4, -123, 14, 4, 3, MAT.gate);
    // Four pyramid pillars flanking the entrance
    pillar(-10, -123, 2, 2, 14, MAT.gate);
    pillar(-6, -123, 2, 2, 14, MAT.gate);
    pillar(-2, -123, 2, 2, 14, MAT.gate);
    pillar(2, -123, 2, 2, 14, MAT.gate);
    addLabel('main_gate', '🏛️ Main Gate', -4, 18, -123);
    origColor['main_gate'] = 0xb89a6a;

    // Gate plaza & security booths
    reg('gate_plaza', 'Gate Plaza & Security', 'infrastructure',
        'Entry plaza with security booth, visitor registration, and vehicle checking.',
        ['Security', 'Entry', 'Parking']);
    ground(-17, -137, 20, 6, MAT.sidewalk);
    box('gate_plaza', -11, -127, 3, 3, 3, MAT.concrete);
    box('gate_plaza', 3, -127, 3, 3, 3, MAT.concrete);
    origColor['gate_plaza'] = 0xe8e0d4;

    // =====================================================================
    // S — SPIRAL STRUCTURE  (just south of main gate, on the entry road)
    // Gate service road: (-19.5,-132.6)→(-18.4,-129.6)→(-17.1,-127.8)→(-15.6,-126.3)
    // Placed at the midpoint of the entry path, before the first internal junction
    // =====================================================================
    reg('spiral', 'Spiral / DNA Sculpture', 'landmark',
        'Decorative spiral sculpture near the main entrance.',
        ['Spiral', 'Art', 'Sculpture']);
    const spiralGroup = new THREE.Group();
    const spiralMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.3 });
    for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 4;
        const r = 2;
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), spiralMat);
        sphere.position.set(Math.cos(angle) * r, i * 0.3, Math.sin(angle) * r);
        sphere.userData.id = 'spiral';
        spiralGroup.add(sphere);
    }
    // Positioned on the entry road, between gate (-133) and first junction (-113)
    spiralGroup.position.set(-4, 0, -93);
    scene.add(spiralGroup);
    spiralGroup.traverse(c => {
        if (c.isMesh) { allMeshes.push(c); if (!meshById['spiral']) meshById['spiral'] = []; meshById['spiral'].push(c); }
    });
    addLabel('spiral', '🌀 Spiral Structure', -4, 14, -93);
    origColor['spiral'] = 0xcccccc;

    // =====================================================================
    // ROW 1 — HOSTELS H1-H3, PARKING, DEPARTMENTS D1-D4
    // =====================================================================

    // H1 — Hostel 1 (far left, top row)
    reg('hostel_1', 'Hostel 1', 'hostel',
        'Student hostel block in the north-west residential cluster.',
        ['Hostel', 'Residential']);
    createHostelBlock('hostel_1', -159, -56, 15, 15, 10, '🏠 H1');
    origColor['hostel_1'] = 0xd4c4a8;

    // H2 — Hostel 2
    reg('hostel_2', 'Hostel 2', 'hostel',
        'Student hostel block adjacent to H1.',
        ['Hostel', 'Residential']);
    createHostelBlock('hostel_2', -133, -56, 15, 15, 10, '🏠 H2');
    origColor['hostel_2'] = 0xc8b898;

    // H3 — Hostel 3 (slightly larger)
    reg('hostel_3', 'Hostel 3', 'hostel',
        'Student hostel block, larger footprint.',
        ['Hostel', 'Residential']);
    createHostelBlock('hostel_3', -102, -58, 15, 15, 10, '🏠 H3');
    origColor['hostel_3'] = 0xd4c4a8;

    // P — Parking Area
    reg('parking', 'Parking Area', 'infrastructure',
        'Open parking lot between hostel and department zones.',
        ['Parking', 'Vehicles']);
    ground(-75, -58, 12, 8, MAT.parking);
    addLabel('parking', '🅿️ Parking', -75, 2, -58);
    origColor['parking'] = 0x484848;

    // D1 — Department 1
    reg('dept_1', 'Department Block 1', 'academic',
        'Academic department building.',
        ['Department', 'Academic']);
    box('dept_1', -58, -58, 14, 14, 12, MAT.academic);
    addLabel('dept_1', '🏫 D1', -58, 15, -58);
    origColor['dept_1'] = 0xe0d8cc;

    // D2 — Department 2 (large central block)
    reg('dept_2', 'Department Block 2', 'academic',
        'Main academic department building — largest block on campus.',
        ['Department', 'Academic']);
    box('dept_2', -35, -58, 14, 14, 13, MAT.academicB);
    addLabel('dept_2', '🏫 D2', -35, 16, -58);
    origColor['dept_2'] = 0xd8cfc0;

    // D3 — Department 3
    reg('dept_3', 'Department Block 3', 'academic',
        'Academic department building, right of centre.',
        ['Department', 'Academic']);
    box('dept_3', 30, -58, 15, 10, 12, MAT.academic);
    addLabel('dept_3', '🏫 D3', 30, 15, -58);
    origColor['dept_3'] = 0xe0d8cc;

    // D4 — Department 4
    reg('dept_4', 'Department Block 4', 'academic',
        'Academic department building on the eastern side.',
        ['Department', 'Academic']);
    box('dept_4', 49, -63, 14, 8, 12, MAT.academicB);
    addLabel('dept_4', '🏫 D4', 49, 15, -63);
    origColor['dept_4'] = 0xd8cfc0;

    // =====================================================================
    // ROW 2 — H4-H6, MESS, UT, MC, WORKSHOP, CAFETERIA, LHC, A, LIB, VF
    // =====================================================================

    // H5 — Hostel 5 (below H1)
    reg('hostel_5', 'Hostel 5', 'hostel',
        'Student hostel in the lower-left residential area.',
        ['Hostel', 'Residential']);
    createHostelBlock('hostel_5', -139, -27, 10, 8, 10, '🏠 H5');
    origColor['hostel_5'] = 0xd4c4a8;

    // H4 — Hostel 4 (below H2)
    reg('hostel_4', 'Hostel 4', 'hostel',
        'Student hostel in the lower-left residential area.',
        ['Hostel', 'Residential']);
    createHostelBlock('hostel_4', -147, -15, 10, 8, 10, '🏠 H4');
    origColor['hostel_4'] = 0xc8b898;

    // Mess — Dining Hall
    reg('mess', 'Mess / Dining Hall', 'dining',
        'Main dining facility for hostel residents — breakfast, lunch, dinner.',
        ['Food', 'Mess', 'Dining']);
    box('mess', -110, -15, 14, 10, 5, MAT.brick);
    addLabel('mess', '🍽️ Mess', -120, 8, -15);
    origColor['mess'] = 0xc4956a;

    // UT — Utility Block
    reg('utility', 'Utility Block', 'infrastructure',
        'Campus utility services — power, water treatment, maintenance.',
        ['Utility', 'Services']);
    box('utility', -75, -41, 6, 5, 5, MAT.concrete);
    addLabel('utility', '🔧 UT', -75, 8, -41);
    origColor['utility'] = 0xe8e0d4;

    // MC — Medical Centre
    reg('medical', 'Medical Centre', 'facility',
        'Campus health centre — primary healthcare, first aid, medical assistance.',
        ['Medical', 'Health', 'Clinic']);
    box('medical', -75, -33, 8, 6, 6, MAT.concreteW);
    addLabel('medical', '🏥 MC', -75, 9, -33);
    origColor['medical'] = 0xf0ece6;

    // H6 — Hostel 6
    reg('hostel_6', 'Hostel 6', 'hostel',
        'Student hostel south of the utility and medical blocks.',
        ['Hostel', 'Residential']);
    createHostelBlock('hostel_6', -72, -15, 15, 10, 10, '🏠 H6');
    origColor['hostel_6'] = 0xd4c4a8;

    // Workshop
    reg('workshop', 'Workshop', 'facility',
        'Fabrication and machining workshop for research and academic projects.',
        ['Workshop', 'Fabrication', 'Machining']);
    box('workshop', -42, -15, 12, 8, 6, MAT.brick);
    addLabel('workshop', '🔧 Workshop', -42, 9, -15);
    origColor['workshop'] = 0xc4956a;

    // Cafeteria (below Workshop)
    reg('cafeteria', 'Cafeteria', 'dining',
        'Campus cafeteria — snacks, beverages, casual dining.',
        ['Cafeteria', 'Food', 'Snacks']);
    box('cafeteria', -42, 3, 16, 15, 5, MAT.brickDark);
    addLabel('cafeteria', '☕ Cafeteria', -42, 8, 3);
    origColor['cafeteria'] = 0xa07050;

    // LHC — Lecture Hall Complex
    reg('lhc', 'Lecture Hall Complex', 'academic',
        'Multiple tiered auditoriums for classes, seminars, and workshops.',
        ['Lectures', 'Seminars', 'Auditorium']);
    box('lhc', -30, -36, 10, 8, 8, MAT.concrete);
    addLabel('lhc', '🎓 LHC', -30, 11, -36);
    origColor['lhc'] = 0xe8e0d4;

    // A — Auditorium
    reg('auditorium', 'Auditorium', 'admin',
        'Large auditorium for convocations, Zeitgeist, Advitiya, and major events.',
        ['Auditorium', 'Events', 'Convocation']);
    box('auditorium', -2, -38, 10, 8, 9, MAT.admin);
    addLabel('auditorium', '🎭 Auditorium', -2, 12, -38);
    origColor['auditorium'] = 0xd4ccc0;

    // Lib — Library
    reg('library', 'Central Library', 'facility',
        'State-of-the-art library with digital & physical collections, reading rooms, e-resources.',
        ['Library', 'Books', 'E-Resources']);
    box('library', -2, -27, 10, 6, 9, MAT.concreteW);
    addLabel('library', '📚 Library', -2, 12, -27);
    origColor['library'] = 0xf0ece6;

    // Visiting Faculty (distinctive courtyard building)
    reg('visiting_faculty', 'Visiting Faculty Block', 'residential',
        'Square courtyard building with tensile cone roof — short-term accommodation for visiting professors and researchers.',
        ['Visiting', 'Faculty', 'Accommodation']);
    createVisitingFacultyBuilding(25, -25);
    origColor['visiting_faculty'] = 0xd4c4a8;

    // =====================================================================
    // SPORTS ZONE — VG, BG, FG, CG  (south campus, z ≈ +50 to +90)
    // =====================================================================

    // VG — Volleyball Ground
    reg('volleyball', 'Volleyball Ground', 'sports',
        'Outdoor volleyball court.',
        ['Volleyball', 'Sports']);
    ground(-48, 67, 8, 14, MAT.sand);
    // Court lines
    box(null, -48, 67, 7.5, 13.5, 0.02, MAT.white, false);
    const vgMesh = ground(-48, 67, 8, 14, MAT.field);
    vgMesh.userData.id = 'volleyball';
    allMeshes.push(vgMesh);
    meshById['volleyball'] = [vgMesh];
    origColor['volleyball'] = 0x5da84e;
    addLabel('volleyball', '🏐 VG', -48, 3, 67);

    // BG — Basketball Ground
    reg('basketball', 'Basketball Ground', 'sports',
        'Outdoor basketball court.',
        ['Basketball', 'Sports']);
    ground(-34, 70, 12, 16, MAT.sand);
    box(null, -34, 70, 11.5, 15.5, 0.02, MAT.white, false);
    const bgMesh = ground(-34, 70, 12, 16, MAT.field);
    bgMesh.userData.id = 'basketball';
    allMeshes.push(bgMesh);
    meshById['basketball'] = [bgMesh];
    origColor['basketball'] = 0x5da84e;
    addLabel('basketball', '🏀 BG', -34, 3, 70);

    // FG — Football Ground
    reg('football', 'Football Ground', 'sports',
        'Standard football field for inter-IIT and intra-college matches.',
        ['Football', 'Soccer']);
    ground(45, 82, 24, 16, MAT.field);
    box(null, 33, 82, 0.3, 16, 3, MAT.white, false);   // left goal
    box(null, 57, 82, 0.3, 16, 3, MAT.white, false);   // right goal
    const fgMesh = ground(45, 82, 24, 16, MAT.grassLight);
    fgMesh.userData.id = 'football';
    allMeshes.push(fgMesh);
    meshById['football'] = [fgMesh];
    origColor['football'] = 0x6aaf5e;
    addLabel('football', '⚽ FG', 45, 4, 82);

    // CG — Cricket Ground
    reg('cricket', 'Cricket Ground', 'sports',
        'Full-size cricket ground with pitch and boundary markings.',
        ['Cricket', 'Sports']);
    const cricketGeo = new THREE.CircleGeometry(14, 32);
    const cricketMesh = new THREE.Mesh(cricketGeo, MAT.field);
    cricketMesh.rotation.x = -Math.PI / 2;
    cricketMesh.position.set(45, 0.05, 120);
    cricketMesh.receiveShadow = true;
    cricketMesh.userData.id = 'cricket';
    scene.add(cricketMesh);
    allMeshes.push(cricketMesh);
    meshById['cricket'] = [cricketMesh];
    origColor['cricket'] = 0x5da84e;
    box(null, 45, 120, 1.5, 8, 0.05, MAT.sand, false); // pitch strip
    addLabel('cricket', '🏏 CG', 45, 4, 120);

    // =====================================================================
    // BOUNDARY WALLS
    // =====================================================================
    reg('boundary', 'Campus Boundary Wall', 'infrastructure',
        'Perimeter boundary wall of the 525-acre permanent campus.',
        ['Boundary', 'Wall', 'Perimeter']);
    wall(-200, -140, 200, -140, 2.5, 0.4);  // North wall
    wall(-200, 150, 200, 150, 2.5, 0.4);    // South wall
    wall(-200, -140, -200, 150, 2.5, 0.4);  // West wall
    wall(200, -140, 200, 150, 2.5, 0.4);    // East wall
    origColor['boundary'] = 0xe8e0d4;

    // =====================================================================
    // COMMENTED-OUT STRUCTURES — may be re-enabled later
    // =====================================================================
    /*
    // --- Academic Row (z ≈ 0) --- named blocks along SROW
    reg('ramanujan', 'S. Ramanujan Block', 'academic', '...', ['Mathematics']);
    box('ramanujan', -42, 0, 20, 8, 12, MAT.academic);
    addLabel('ramanujan', '📐 Ramanujan Block', -42, 16, 0);
    origColor['ramanujan'] = 0xe0d8cc;

    reg('bhatnagar', 'S. Bhatnagar Block', 'academic', '...', ['Chemistry']);
    box('bhatnagar', -8, 0, 16, 8, 12, MAT.academicB);
    addLabel('bhatnagar', '🧪 Bhatnagar Block', -8, 16, 0);
    origColor['bhatnagar'] = 0xd8cfc0;

    reg('jcbose', 'J.C. Bose Block', 'academic', '...', ['Physics']);
    box('jcbose', 12, 0, 12, 8, 12, MAT.academic);
    addLabel('jcbose', '📡 J.C. Bose Block', 12, 16, 0);
    origColor['jcbose'] = 0xe0d8cc;

    reg('visvesvaraya', 'M. Visvesvaraya Block', 'academic', '...', ['Mechanical']);
    box('visvesvaraya', 31, 0, 16, 8, 12, MAT.academicB);
    addLabel('visvesvaraya', '⚙️ Visvesvaraya Block', 31, 16, 0);
    origColor['visvesvaraya'] = 0xd8cfc0;

    reg('satish_dhawan', 'Satish Dhawan Block', 'academic', '...', ['Aerospace']);
    box('satish_dhawan', 63, 0, 12, 8, 12, MAT.academic);
    addLabel('satish_dhawan', '🚀 Satish Dhawan', 63, 16, 0);
    origColor['satish_dhawan'] = 0xe0d8cc;

    reg('khorana', 'Har Gobind Khorana Block', 'academic', '...', ['Biomedical']);
    box('khorana', 77, 0, 12, 8, 12, MAT.academicB);
    addLabel('khorana', '🧬 Khorana Block', 77, 16, 0);
    origColor['khorana'] = 0xd8cfc0;

    // --- Labs row (z ≈ 14) ---
    reg('cse', 'CSE Department', 'academic', '...', ['CSE']);
    box('cse', -8, 14, 12, 6, 11, MAT.academic);
    reg('ee_labs', 'EE Research Labs', 'academic', '...', ['Electrical']);
    box('ee_labs', 63, 14, 10, 6, 10, MAT.academicB);
    reg('mech_labs', 'ME Research Labs', 'academic', '...', ['Mechanical']);
    box('mech_labs', 77, 14, 10, 6, 10, MAT.academic);
    reg('biotech', 'Biotech Lab', 'academic', '...', ['Biotech']);
    box('biotech', 12, 14, 8, 6, 9, MAT.academicB);

    // --- Faculty Housing ---
    reg('faculty_housing', 'Faculty Housing Complex', 'residential', '...', ['Faculty']);
    box('faculty_housing', 150, 0, 10, 15, 8, MAT.hostel);
    box('faculty_housing', 162, 0, 10, 15, 8, MAT.hostelAlt);
    addLabel('faculty_housing', '🏘️ Faculty Housing', 156, 11, 0);
    origColor['faculty_housing'] = 0xd4c4a8;

    // --- Guest House ---
    reg('guest_house', 'Guest House', 'admin', '...', ['Guest']);
    box('guest_house', 155, -40, 8, 8, 7, MAT.hostel);
    addLabel('guest_house', '🏠 Guest House', 155, 10, -40);
    origColor['guest_house'] = 0xd4c4a8;

    // --- Server Room ---
    reg('server_room', 'Data Center & IT', 'facility', '...', ['IT']);
    box('server_room', 125, 0, 6, 10, 10, MAT.metal);
    addLabel('server_room', '🖥️ Data Center', 125, 13, 0);
    origColor['server_room'] = 0x8899aa;

    // --- Indoor Sports Complex ---
    reg('sports_complex', 'Indoor Sports Complex', 'sports', '...', ['Indoor']);
    box('sports_complex', 1.5, 60, 14, 8, 8, MAT.sports);
    addLabel('sports_complex', '🏀 Sports Complex', 1.5, 11, 60);
    origColor['sports_complex'] = 0xc0a888;

    // --- Other facilities ---
    reg('admin_block', 'Administrative Block', 'admin', '...', ['Admin']);
    box('admin_block', -35, -59, 20, 14, 10, MAT.admin);
    reg('crf', 'Central Research Facility', 'facility', '...', ['Research']);
    box('crf', -3, -58, 16, 6, 10, MAT.concrete);
    reg('awadh', 'AWaDH Innovation Hub', 'facility', '...', ['Innovation']);
    box('awadh', 31, -65, 14, 5, 9, MAT.concrete);
    reg('sac', 'Student Activity Centre', 'facility', '...', ['Students']);
    box('sac', -83, -62, 8, 8, 8, MAT.concrete);
    reg('sbi', 'SBI Bank & Post Office', 'facility', '...', ['Bank']);
    box('sbi', -83, -75, 6, 5, 5, MAT.concrete);
    */
}



// =====================================================================
// 12. COMPASS
// =====================================================================
function buildCompass() {
    const arrowGeo = new THREE.ConeGeometry(1.5, 5, 3);
    const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    arrow.position.set(195, 5, -85);
    scene.add(arrow);
    addLabel(null, '⬆ N', 195, 10, -85);
}

// =====================================================================
// 13. INTERACTION — Click, Hover, Selection
// =====================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(allMeshes, false);
    if (hits.length > 0 && hits[0].object.userData.id) {
        selectBuilding(hits[0].object.userData.id);
    }
});

canvas.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(allMeshes, false);
    renderer.domElement.style.cursor = hits.length > 0 && hits[0].object.userData.id ? 'pointer' : 'grab';
});

function selectBuilding(id) {
    // Deselect previous
    if (selectedId && meshById[selectedId]) {
        meshById[selectedId].forEach(m => {
            m.material = m.material.clone();
            m.material.color.setHex(origColor[selectedId]);
            m.material.emissive.setHex(0x000000);
        });
    }

    selectedId = id;

    // Highlight new
    if (meshById[id]) {
        meshById[id].forEach(m => {
            m.material = m.material.clone();
            m.material.color.setHex(0xfbbf24);
            m.material.emissive.setHex(0x443300);
        });
    }

    // Fly camera
    const meshes = meshById[id];
    if (meshes && meshes.length > 0) {
        const pos = meshes[0].position;
        animateCamera(
            new THREE.Vector3(pos.x + 25, pos.y + 30, pos.z + 30),
            new THREE.Vector3(pos.x, pos.y, pos.z)
        );
    }

    // Show info
    showInfo(id);
    document.querySelectorAll('.bl-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
}

function animateCamera(toPos, toLook) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const dur = 800, t0 = performance.now();
    function step(now) {
        const t = Math.min((now - t0) / dur, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        camera.position.lerpVectors(startPos, toPos, ease);
        controls.target.lerpVectors(startTarget, toLook, ease);
        controls.update();
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// =====================================================================
// 14. INFO PANEL
// =====================================================================
function showInfo(id) {
    const b = CAMPUS_DATA.find(b => b.id === id);
    if (!b) return;
    document.getElementById('infoTitle').textContent = b.name;
    document.getElementById('infoDesc').textContent = b.desc;
    const tagsEl = document.getElementById('infoTags');
    tagsEl.innerHTML = '';
    b.tags.forEach(t => {
        const s = document.createElement('span');
        s.className = 'itag';
        s.textContent = t;
        tagsEl.appendChild(s);
    });
    document.getElementById('infoPanel').classList.remove('hidden');
}

document.getElementById('closeInfo').addEventListener('click', () => {
    document.getElementById('infoPanel').classList.add('hidden');
});

// =====================================================================
// 15. SIDEBAR
// =====================================================================
function populateList(filter = '') {
    const el = document.getElementById('buildingList');
    el.innerHTML = '';
    const cats = ['academic', 'hostel', 'admin', 'facility', 'dining', 'sports', 'landmark', 'residential', 'infrastructure'];
    const catNames = {
        academic: '📚 Academic', hostel: '🏠 Hostels', admin: '🏛️ Admin',
        facility: '🔧 Facilities', dining: '🍽️ Dining', sports: '⚽ Sports',
        landmark: '🗿 Landmarks', residential: '🏘️ Residential', infrastructure: '⚙️ Infrastructure',
    };
    const q = filter.toLowerCase();
    const filtered = CAMPUS_DATA.filter(b =>
        b.name.toLowerCase().includes(q) || b.cat.includes(q) || b.tags.some(t => t.toLowerCase().includes(q))
    );
    cats.forEach(cat => {
        const items = filtered.filter(b => b.cat === cat);
        if (!items.length) return;
        const hdr = document.createElement('div');
        hdr.className = 'bl-cat';
        hdr.textContent = catNames[cat] || cat;
        el.appendChild(hdr);
        items.forEach(b => {
            const row = document.createElement('div');
            row.className = 'bl-item';
            row.dataset.id = b.id;
            row.innerHTML = `<div class="bl-dot" style="background:${CAT_COLORS[b.cat] || '#888'}"></div>
                <div><div class="bl-name">${b.name}</div><div class="bl-sub">${b.tags.slice(0, 2).join(' · ')}</div></div>`;
            row.addEventListener('click', () => selectBuilding(b.id));
            el.appendChild(row);
        });
    });
}

document.getElementById('searchBox').addEventListener('input', e => populateList(e.target.value));

// =====================================================================
// 16. HEADER BUTTONS
// =====================================================================
document.getElementById('btnReset').addEventListener('click', () => {
    if (selectedId && meshById[selectedId]) {
        meshById[selectedId].forEach(m => {
            m.material = m.material.clone();
            m.material.color.setHex(origColor[selectedId]);
            m.material.emissive.setHex(0x000000);
        });
        selectedId = null;
    }
    document.getElementById('infoPanel').classList.add('hidden');
    document.querySelectorAll('.bl-item').forEach(el => el.classList.remove('active'));
    animateCamera(new THREE.Vector3(0, 160, 180), new THREE.Vector3(0, 0, 0));
});

document.getElementById('btnTop').addEventListener('click', () => {
    animateCamera(new THREE.Vector3(0, 250, 1), new THREE.Vector3(0, 0, 0));
});

document.getElementById('btnLabels').addEventListener('click', function () {
    labelsVisible = !labelsVisible;
    this.classList.toggle('active', labelsVisible);
    Object.values(labelById).forEach(l => { l.visible = labelsVisible; });
});

document.getElementById('btnWire').addEventListener('click', function () {
    const active = this.classList.toggle('active');
    Object.values(meshById).forEach(arr => arr.forEach(m => {
        m.material = m.material.clone();
        m.material.wireframe = active;
    }));
});

// =====================================================================
// 17. RESIZE
// =====================================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================================================================
// 18. ANIMATION LOOP
// =====================================================================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

// =====================================================================
// 19. INIT
// =====================================================================
buildTerrain();
buildRoads();
buildAllBuildings();
buildCompass();
populateList();
animate();

// Hide loader
setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) { loader.classList.add('gone'); setTimeout(() => loader.remove(), 500); }
}, 800);

console.log(`✅ IIT Ropar 3D Campus: ${CAMPUS_DATA.length} buildings, fully hardcoded.`);

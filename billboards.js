import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { settings } from './gui_settings.js';

let buttonsScene, buttonsCamera, buttonsRenderer, billboards = [], raycaster, pointer;
let regularFont, boldFont;
let animationId;
let billboardsContainer;
let billboardClickCallback = null;

const BILLBOARD_SPACING = 8;
const BILLBOARD_START_Y = 12;
const BILLBOARD_X = 0;
const BOX_PADDING = 1.5;
const ROTATION_RANGE = 0.1;
const HORIZONTAL_SPACING = 12;
const ROW_SPACINGS = [6, 10];

const BILLBOARD_DATA = [
    { text: "August Graham", size: 2.5, row: 0, column: 0 },
    { text: "About Me", size: 2, row: 1, column: -0.5 },
    { text: "Projects", size: 2, row: 1, column: 0.5 },
    { text: "Contact", size: 2, row: 2, column: 0 }
];

const ABOUT_ME_TEXT = `August Graham is a multimedia artist\nbased in Brooklyn building interactive\nand immersive experiences for musicians,\nbrands, and beyond.`;

function loadFont(url) {
    return new Promise((resolve, reject) => {
        const loader = new FontLoader();
        loader.load(url, resolve, undefined, reject);
    });
}

function createBillboards() {
    billboards = [];
    buttonsScene.clear();
    // Calculate row heights
    const rowHeights = {};
    BILLBOARD_DATA.forEach(data => {
        const geometry = new TextGeometry(data.text, {
            font: regularFont,
            size: data.size,
            height: 0,
            curveSegments: 12
        });
        geometry.computeBoundingBox();
        const textHeight = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
        if (!rowHeights[data.row] || textHeight > rowHeights[data.row]) {
            rowHeights[data.row] = textHeight;
        }
    });
    BILLBOARD_DATA.forEach((data, index) => {
        // Regular and bold text
        const geometry = new TextGeometry(data.text, {
            font: regularFont,
            size: data.size,
            height: 0,
            curveSegments: 12
        });
        const boldGeometry = new TextGeometry(data.text, {
            font: boldFont,
            size: data.size,
            height: 0,
            curveSegments: 12
        });
        geometry.computeBoundingBox();
        boldGeometry.computeBoundingBox();
        const textWidth = Math.max(
            geometry.boundingBox.max.x - geometry.boundingBox.min.x,
            boldGeometry.boundingBox.max.x - boldGeometry.boundingBox.min.x
        );
        const textHeight = Math.max(
            geometry.boundingBox.max.y - geometry.boundingBox.min.y,
            boldGeometry.boundingBox.max.y - boldGeometry.boundingBox.min.y
        );
        const centerOffset = -textWidth / 2;
        let yPosition = BILLBOARD_START_Y;
        for (let row = 0; row < data.row; row++) {
            yPosition -= rowHeights[row];
            yPosition -= (ROW_SPACINGS[row] || BILLBOARD_SPACING);
        }
        const xPosition = BILLBOARD_X + (data.column * (textWidth + HORIZONTAL_SPACING));
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const regularMesh = new THREE.Mesh(geometry, textMaterial.clone());
        const boldMesh = new THREE.Mesh(boldGeometry, textMaterial.clone());
        boldMesh.visible = false;
        const boxWidth = textWidth + BOX_PADDING * 2;
        const boxHeight = textHeight + BOX_PADDING * 2;
        // For About Me, start collapsed, but store expanded/collapsed state
        let expanded = false;
        let targetHeight = boxHeight;
        let animatedHeight = boxHeight;
        let targetRadius = settings.aboutMeCollapsedRadius;
        let animatedRadius = settings.aboutMeCollapsedRadius;
        let targetWidth = boxWidth;
        let animatedWidth = boxWidth;
        let expandedWidth = boxWidth;
        // Create rounded rectangle shape (function for animation)
        function makeShape(width, height, radius) {
            const maxRadius = Math.min(width, height) / 2 - 0.01;
            const r = Math.max(0, Math.min(radius, maxRadius));
            const topRadius = 1;    // Constant for top corners
            const bottomRadius = r; // Animated for bottom corners
            const shape = new THREE.Shape();
            // Start at top-left
            shape.moveTo(-width/2 + topRadius, height/2);
            shape.lineTo(width/2 - topRadius, height/2);
            shape.quadraticCurveTo(width/2, height/2, width/2, height/2 - topRadius);
            shape.lineTo(width/2, -height/2 + bottomRadius);
            shape.quadraticCurveTo(width/2, -height/2, width/2 - bottomRadius, -height/2);
            shape.lineTo(-width/2 + bottomRadius, -height/2);
            shape.quadraticCurveTo(-width/2, -height/2, -width/2, -height/2 + bottomRadius);
            shape.lineTo(-width/2, height/2 - topRadius);
            shape.quadraticCurveTo(-width/2, height/2, -width/2 + topRadius, height/2);
            return shape;
        }
        let filledBox, boxMesh, aboutMeTextMesh;
        // Create initial shape
        let shape = makeShape(boxWidth, boxHeight, settings.aboutMeCollapsedRadius);
        let boxGeometry = new THREE.ShapeGeometry(shape);
        const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
        filledBox = new THREE.Mesh(boxGeometry, fillMaterial);
        filledBox.renderOrder = 0;
        const boxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const boxWireframe = new THREE.EdgesGeometry(boxGeometry);
        boxMesh = new THREE.LineSegments(boxWireframe, boxMaterial);
        boxMesh.renderOrder = 2;
        boxMesh.material.depthTest = false;
        regularMesh.renderOrder = 1;
        boldMesh.renderOrder = 1;
        const container = new THREE.Group();
        container.position.set(xPosition, yPosition, 0);
        // Set About Me title mesh position so its top edge is always at the top of the billboard
        if (data.text === 'About Me') {
            // Compute the top offset (title's bounding box max.y)
            const titleTop = geometry.boundingBox.max.y;
            // Place the title so its top is at +animatedHeight/2 (top of the billboard)
            regularMesh.position.set(centerOffset, boxHeight/2 - titleTop, 0);
            boldMesh.position.set(centerOffset, boxHeight/2 - titleTop, 0);
        } else {
            regularMesh.position.set(centerOffset, -textHeight/2, 0);
            boldMesh.position.set(centerOffset, -textHeight/2, 0);
        }
        container.add(filledBox);
        container.add(regularMesh);
        container.add(boldMesh);
        container.add(boxMesh);
        // About Me extra text mesh (hidden by default)
        if (data.text === 'About Me') {
            const aboutMeGeometry = new TextGeometry(ABOUT_ME_TEXT, {
                font: regularFont,
                size: 1.5,
                height: 0,
                curveSegments: 8
            });
            aboutMeGeometry.computeBoundingBox();
            aboutMeTextMesh = new THREE.Mesh(aboutMeGeometry, textMaterial.clone());
            // Compute expanded width from aboutMeTextMesh bounding box
            const aboutMeTextWidth = aboutMeGeometry.boundingBox.max.x - aboutMeGeometry.boundingBox.min.x;
            expandedWidth = Math.max(boxWidth, aboutMeTextWidth + 2 * BOX_PADDING + 4); // Add extra padding
            aboutMeTextMesh.position.set(-expandedWidth/2 + 2, -boxHeight/2 - 8, 0.1);
            aboutMeTextMesh.visible = false;
            container.add(aboutMeTextMesh);
        }
        const billboard = {
            container,
            regularText: regularMesh,
            boldText: boldMesh,
            box: boxMesh,
            filledBox: filledBox,
            originalY: yPosition,
            targetRotation: 0,
            currentRotation: 0,
            rotationOffset: index * (Math.PI / 8),
            hovered: false,
            baseY: yPosition,
            expanded: false,
            targetHeight,
            animatedHeight,
            targetRadius,
            animatedRadius,
            aboutMeTextMesh,
            boxWidth,
            boxHeight,
            makeShape,
            targetWidth,
            animatedWidth,
            expandedWidth
        };
        buttonsScene.add(container);
        billboards.push(billboard);
    });
}

function animate() {
    animationId = requestAnimationFrame(animate);
    billboards.forEach((billboard, index) => {
        if (BILLBOARD_DATA[index].text === 'About Me') {
            const targetH = billboard.expanded ? settings.aboutMeExpandedHeight : billboard.boxHeight;
            const targetR = billboard.expanded ? settings.aboutMeExpandedRadius : settings.aboutMeCollapsedRadius;
            const targetW = billboard.expanded ? billboard.expandedWidth : billboard.boxWidth;
            billboard.animatedHeight += (targetH - billboard.animatedHeight) * settings.aboutMeAnimationSpeed;
            billboard.animatedRadius += (targetR - billboard.animatedRadius) * settings.aboutMeAnimationSpeed;
            billboard.animatedWidth += (targetW - billboard.animatedWidth) * settings.aboutMeAnimationSpeed;
            // Update geometry
            const shape = billboard.makeShape(billboard.animatedWidth, billboard.animatedHeight, billboard.animatedRadius);
            billboard.filledBox.geometry.dispose();
            billboard.filledBox.geometry = new THREE.ShapeGeometry(shape);
            billboard.box.geometry.dispose();
            billboard.box.geometry = new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape));
            // Keep the top edge fixed: offset container so top stays at baseY
            billboard.container.position.y = billboard.baseY - (billboard.animatedHeight - billboard.boxHeight) / 2 + Math.sin(Date.now() * settings.floatSpeed + index) * 0.5;
            // Show/hide aboutMeTextMesh and adjust its position
            if (billboard.aboutMeTextMesh) {
                billboard.aboutMeTextMesh.visible = billboard.animatedHeight > billboard.boxHeight + 10;
                // Place text a bit below the original box, and center horizontally in expanded width
                billboard.aboutMeTextMesh.position.x = -billboard.animatedWidth/2 + 2;
                billboard.aboutMeTextMesh.position.y = -billboard.animatedHeight/2 + 18;
            }
            // Keep About Me title mesh at the top as height animates, and center horizontally
            if (billboard.regularText && billboard.boldText) {
                const titleTop = billboard.regularText.geometry.boundingBox.max.y;
                const titleWidth = billboard.regularText.geometry.boundingBox.max.x - billboard.regularText.geometry.boundingBox.min.x;
                const centerOffset = -titleWidth / 2;
                billboard.regularText.position.x = centerOffset;
                billboard.boldText.position.x = centerOffset;
                billboard.regularText.position.y = billboard.animatedHeight/2 - titleTop;
                billboard.boldText.position.y = billboard.animatedHeight/2 - titleTop;
            }
        } else {
            // For other billboards, keep float animation
            billboard.container.position.y = billboard.baseY + Math.sin(Date.now() * settings.floatSpeed + index) * 0.5;
        }
        if (billboard.hovered) {
            billboard.targetRotation = ROTATION_RANGE * Math.sin(Date.now() * settings.rotationSpeed + billboard.rotationOffset);
        } else {
            billboard.targetRotation = 0;
        }
        billboard.currentRotation += (billboard.targetRotation - billboard.currentRotation) * 0.1;
        billboard.container.rotation.z = billboard.currentRotation;
    });
    buttonsRenderer.render(buttonsScene, buttonsCamera);
}

function handlePointer(event) {
    const rect = buttonsRenderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        pointer.x = (x / rect.width) * 2 - 1;
        pointer.y = -(y / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, buttonsCamera);
        billboards.forEach(billboard => {
            const wasHovered = billboard.hovered;
            billboard.hovered = raycaster.intersectObject(billboard.filledBox).length > 0;
            if (wasHovered !== billboard.hovered) {
                billboard.regularText.visible = !billboard.hovered;
                billboard.boldText.visible = billboard.hovered;
            }
        });
    }
}
function resetPointer() {
    billboards.forEach(billboard => {
        billboard.hovered = false;
        billboard.regularText.visible = true;
        billboard.boldText.visible = false;
    });
}

function resize() {
    if (!billboardsContainer || !buttonsRenderer || !buttonsCamera) return;
    const rect = billboardsContainer.getBoundingClientRect();
    buttonsRenderer.setSize(rect.width, rect.height, false);
    buttonsCamera.aspect = rect.width / rect.height;
    // Use window aspect ratio to determine zoom
    const windowAspect = window.innerWidth / window.innerHeight;
    const zoomFactor = windowAspect > 1 ? settings.desktopZoom : settings.mobileZoom;
    buttonsCamera.position.z = 50 * zoomFactor;
    buttonsCamera.updateProjectionMatrix();
}

export function initBillboards(container, onBillboardClick) {
    billboardsContainer = container;
    billboardClickCallback = onBillboardClick;
    buttonsScene = new THREE.Scene();
    buttonsCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    buttonsRenderer = new THREE.WebGLRenderer({ antialias: true });
    buttonsCamera.position.z = 50;
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    container.appendChild(buttonsRenderer.domElement);
    resize();
    window.addEventListener('resize', resize);
    Promise.all([
        loadFont('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json'),
        loadFont('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json')
    ]).then(([regular, bold]) => {
        regularFont = regular;
        boldFont = bold;
        createBillboards();
    });
    buttonsRenderer.domElement.addEventListener('mousemove', handlePointer);
    buttonsRenderer.domElement.addEventListener('mouseleave', resetPointer);
    buttonsRenderer.domElement.addEventListener('touchmove', (event) => {
        if (event.touches.length > 0) handlePointer(event.touches[0]);
    });
    buttonsRenderer.domElement.addEventListener('touchstart', (event) => {
        if (event.touches.length > 0) handlePointer(event.touches[0]);
    });
    buttonsRenderer.domElement.addEventListener('touchend', resetPointer);
    buttonsRenderer.domElement.addEventListener('touchcancel', resetPointer);
    // Add click/tap event for billboards
    buttonsRenderer.domElement.addEventListener('click', (event) => {
        const rect = buttonsRenderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        pointer.x = (x / rect.width) * 2 - 1;
        pointer.y = -(y / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, buttonsCamera);
        billboards.forEach((billboard, index) => {
            if (raycaster.intersectObject(billboard.filledBox).length > 0) {
                const text = BILLBOARD_DATA[index].text;
                // Toggle About Me, collapse others
                billboards.forEach((bb, i) => {
                    if (i === index && text === 'About Me') {
                        bb.expanded = !bb.expanded;
                    } else {
                        bb.expanded = false;
                    }
                });
                if (billboardClickCallback) billboardClickCallback(text);
            } else {
                // Collapse all if any other area is clicked
                billboard.expanded = false;
            }
        });
    });
    buttonsRenderer.domElement.addEventListener('touchend', (event) => {
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            const rect = buttonsRenderer.domElement.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            pointer.x = (x / rect.width) * 2 - 1;
            pointer.y = -(y / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, buttonsCamera);
            billboards.forEach((billboard, index) => {
                if (raycaster.intersectObject(billboard.filledBox).length > 0) {
                    const text = BILLBOARD_DATA[index].text;
                    if (billboardClickCallback) billboardClickCallback(text);
                }
            });
        }
    });
    animate();
}
export { resize }; 
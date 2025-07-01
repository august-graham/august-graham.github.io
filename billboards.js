import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { settings } from './gui_settings.js';

let buttonsScene, buttonsCamera, buttonsRenderer, billboards = [], raycaster, pointer;
let regularFont, boldFont;
let animationId;
let billboardsContainer;
let billboardClickCallback = null;
let contentManager = null;

// Mobile detection and optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let lastAnimationTime = 0;

const BILLBOARD_SPACING = 8;
const BILLBOARD_START_Y = 12;
const BILLBOARD_X = 0;
const BOX_PADDING = 1.5;
const ROTATION_RANGE = 0.05;
const HORIZONTAL_SPACING = 6;
const ROW_SPACINGS = [6, 5];

const BILLBOARD_DATA = [
    { text: "August Graham", size: 2.5, row: 0, column: 0 },
    { text: "About Me", size: 2, row: 1, column: -0.4 },
            { text: "Works", size: 2, row: 1, column: -.5 },
    { text: "Contact", size: 2, row: 2, column: -0.4 },
    { text: "Resume", size: 2, row: 2, column: 0.6 }
];

const ABOUT_ME_TEXT = `August Graham is a
multimedia artist based in
Brooklyn building interactive
and immersive experiences
for musicians, brands,
and beyond.`;

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
    // Calculate row widths and total widths for centering
    const rowWidths = {};
    const rowBillboards = {};
    BILLBOARD_DATA.forEach((data, index) => {
        if (!rowBillboards[data.row]) {
            rowBillboards[data.row] = [];
        }
        rowBillboards[data.row].push({ data, index });
    });
    
    // Calculate total width for each row
    Object.keys(rowBillboards).forEach(row => {
        const rowItems = rowBillboards[row];
        let totalWidth = 0;
        rowItems.forEach(({ data }) => {
            const geometry = new TextGeometry(data.text, {
                font: regularFont,
                size: data.size,
                height: 0,
                curveSegments: 12
            });
            geometry.computeBoundingBox();
            const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
            const boxWidth = textWidth + BOX_PADDING * 2;
            totalWidth += boxWidth;
        });
        // Add spacing between items
        if (rowItems.length > 1) {
            totalWidth += HORIZONTAL_SPACING * (rowItems.length - 1);
        }
        rowWidths[row] = totalWidth;
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
        
        // Calculate centered x position for this row
        const rowItems = rowBillboards[data.row];
        const rowIndex = rowItems.findIndex(item => item.index === index);
        let xPosition = BILLBOARD_X - rowWidths[data.row] / 2; // Start from left edge of row
        
        // Add width of previous items in the row
        for (let i = 0; i < rowIndex; i++) {
            const prevData = rowItems[i].data;
            const prevGeometry = new TextGeometry(prevData.text, {
                font: regularFont,
                size: prevData.size,
                height: 0,
                curveSegments: 12
            });
            prevGeometry.computeBoundingBox();
            const prevTextWidth = prevGeometry.boundingBox.max.x - prevGeometry.boundingBox.min.x;
            const prevBoxWidth = prevTextWidth + BOX_PADDING * 2;
            xPosition += prevBoxWidth + HORIZONTAL_SPACING;
        }
        
        // Add half the width of current item to center it
        const boxWidth = textWidth + BOX_PADDING * 2;
        xPosition += boxWidth / 2;
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const regularMesh = new THREE.Mesh(geometry, textMaterial.clone());
        const boldMesh = new THREE.Mesh(boldGeometry, textMaterial.clone());
        boldMesh.visible = false;
        const boxHeight = textHeight + BOX_PADDING * 2;
        // For About Me, start collapsed, but store expanded/collapsed state
        let expanded = false;
        let targetHeight = boxHeight;
        let animatedHeight = boxHeight;
        let targetWidth = boxWidth;
        let animatedWidth = boxWidth;
        let expandedWidth = boxWidth;
        // Create rounded rectangle shape (function for animation)
        function makeShape(width, height, radius, roundBottom = true) {
            const maxRadius = Math.min(width, height) / 2 - 0.01;
            const r = Math.max(0, Math.min(radius, maxRadius));
            const topRadius = 1;    // Constant for top corners
            const bottomRadius = roundBottom ? r : 0; // Animated or square for bottom corners
            const shape = new THREE.Shape();
            // Start at top-left
            shape.moveTo(-width/2 + topRadius, height/2);
            shape.lineTo(width/2 - topRadius, height/2);
            shape.quadraticCurveTo(width/2, height/2, width/2, height/2 - topRadius);
            shape.lineTo(width/2, -height/2 + bottomRadius);
            if (roundBottom) {
                shape.quadraticCurveTo(width/2, -height/2, width/2 - bottomRadius, -height/2);
                shape.lineTo(-width/2 + bottomRadius, -height/2);
                shape.quadraticCurveTo(-width/2, -height/2, -width/2, -height/2 + bottomRadius);
            } else {
                shape.lineTo(width/2, -height/2);
                shape.lineTo(-width/2, -height/2);
            }
            shape.lineTo(-width/2, height/2 - topRadius);
            shape.quadraticCurveTo(-width/2, height/2, -width/2 + topRadius, height/2);
            return shape;
        }
        let filledBox, boxMesh, aboutMeTextMesh;
        // Create initial shape
        let shape;
        if (data.text === 'About Me') {
            // Always all corners rounded
            shape = makeShape(boxWidth, boxHeight, 1, true);
        } else {
            // Clickable: all corners rounded
            shape = makeShape(boxWidth, boxHeight, 1, true);
        }
        let boxGeometry = new THREE.ShapeGeometry(shape);
        const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
        filledBox = new THREE.Mesh(boxGeometry, fillMaterial);
        filledBox.renderOrder = data.text === 'About Me' ? 10 : 0;
        const boxMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        boxMaterial.linewidth = 1; // Make outlines 1px thicker
        const boxWireframe = new THREE.EdgesGeometry(boxGeometry);
        boxMesh = new THREE.LineSegments(boxWireframe, boxMaterial);
        boxMesh.renderOrder = data.text === 'About Me' ? 12 : 2;
        boxMesh.material.depthTest = false;
        regularMesh.renderOrder = data.text === 'About Me' ? 11 : 1;
        boldMesh.renderOrder = data.text === 'About Me' ? 11 : 1;
        const container = new THREE.Group();
        container.position.set(xPosition, yPosition, 0);
        // Set About Me title mesh position so its top edge is always at the top of the billboard
        if (data.text === 'About Me') {
            // Center horizontally in the box, align top edge to top of box with margin
            const centerOffset = -boxWidth / 2 + (boxWidth - textWidth) / 2;
            const titleTop = geometry.boundingBox.max.y;
            const margin = 1.5; // space from top edge
            regularMesh.position.set(centerOffset, boxHeight/2 - titleTop - margin, 0);
            boldMesh.position.set(centerOffset, boxHeight/2 - titleTop - margin, 0);
        } else {
            // Center horizontally and vertically in the box
            const centerOffset = -boxWidth / 2 + (boxWidth - textWidth) / 2;
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
            aboutMeTextMesh = new THREE.Mesh(aboutMeGeometry, new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0
            }));
            // Compute expanded width from aboutMeTextMesh bounding box
            const aboutMeTextWidth = aboutMeGeometry.boundingBox.max.x - aboutMeGeometry.boundingBox.min.x;
            expandedWidth = Math.max(boxWidth, aboutMeTextWidth + 2 * BOX_PADDING + 1); // Reduced extra padding from 4 to 1
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
            baseX: xPosition, // store original x position
            expanded: false,
            targetHeight,
            animatedHeight,
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
        // Check if any billboard is hovered, expanded, or selected
        const anyActive = billboards.some(bb => bb.hovered || bb.expanded);
        if (BILLBOARD_DATA[index].text === 'About Me') {
            const targetH = billboard.expanded ? settings.aboutMeExpandedHeight : billboard.boxHeight;
            const targetW = billboard.expanded ? billboard.expandedWidth : billboard.boxWidth;
            billboard.animatedHeight += (targetH - billboard.animatedHeight) * settings.aboutMeAnimationSpeed;
            billboard.animatedWidth += (targetW - billboard.animatedWidth) * settings.aboutMeAnimationSpeed;
            // Update geometry
            let shape;
            if (BILLBOARD_DATA[index].text === 'About Me') {
                // Always all corners rounded
                shape = billboard.makeShape(billboard.animatedWidth, billboard.animatedHeight, 1, true);
            } else {
                shape = billboard.makeShape(billboard.animatedWidth, billboard.animatedHeight, 1, true);
            }
            billboard.filledBox.geometry.dispose();
            billboard.filledBox.geometry = new THREE.ShapeGeometry(shape);
            billboard.box.geometry.dispose();
            billboard.box.geometry = new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape));
            // Animate to center when expanded
            let targetX = billboard.baseX;
            let targetY = billboard.baseY - (billboard.animatedHeight - billboard.boxHeight) / 2;
            if (billboard.expanded) {
                targetX = 0;
                targetY = 0;
            }
            if (billboard.hovered || billboard.expanded) {
                billboard.container.position.x += (targetX - billboard.container.position.x) * 0.1;
                billboard.container.position.y += (targetY - billboard.container.position.y) * 0.1;
            } else {
                const floatY = targetY + Math.sin(Date.now() * settings.floatSpeed + index) * 0.5;
                const wiggleX = targetX + Math.sin(Date.now() * settings.jiggleSpeed + index * 0.5) * settings.jiggleAmount;
                billboard.container.position.y += (floatY - billboard.container.position.y) * 0.1;
                billboard.container.position.x += (wiggleX - billboard.container.position.x) * 0.1;
            }
            // Show/hide aboutMeTextMesh and adjust its position
            if (billboard.aboutMeTextMesh) {
                // Fade in when expanded, fade out when collapsed
                const expansionProgress = (billboard.animatedHeight - billboard.boxHeight) / (settings.aboutMeExpandedHeight - billboard.boxHeight);
                const fadeStartThreshold = 0.8;
                const fadeProgress = Math.max(0, (expansionProgress - fadeStartThreshold) / (1 - fadeStartThreshold));
                billboard.aboutMeTextMesh.visible = expansionProgress > fadeStartThreshold;
                billboard.aboutMeTextMesh.material.opacity = fadeProgress;
                // Center horizontally and position below the top edge
                const textMargin = 8;
                const aboutMeTextWidth = billboard.aboutMeTextMesh.geometry.boundingBox.max.x - billboard.aboutMeTextMesh.geometry.boundingBox.min.x;
                billboard.aboutMeTextMesh.position.x = -aboutMeTextWidth / 2;
                billboard.aboutMeTextMesh.position.y = billboard.animatedHeight/2 - textMargin;
                // Remove hot pink border if present
                if (billboard.hotPinkBorder) {
                    billboard.hotPinkBorder.visible = false;
                }
            }
            // Keep About Me title mesh at the top as height animates, and center horizontally
            if (billboard.regularText && billboard.boldText) {
                const titleWidth = billboard.regularText.geometry.boundingBox.max.x - billboard.regularText.geometry.boundingBox.min.x;
                const centerOffset = -billboard.animatedWidth / 2 + (billboard.animatedWidth - titleWidth) / 2;
                const titleTop = billboard.regularText.geometry.boundingBox.max.y;
                const margin = 1.5; // space from top edge
                billboard.regularText.position.x = centerOffset;
                billboard.boldText.position.x = centerOffset;
                billboard.regularText.position.y = billboard.animatedHeight/2 - titleTop - margin;
                billboard.boldText.position.y = billboard.animatedHeight/2 - titleTop - margin;
            }
            if (billboard.hovered || billboard.expanded) {
                billboard.targetRotation = 0;
            } else {
                billboard.targetRotation = ROTATION_RANGE * Math.sin(Date.now() * (settings.rotationSpeed * 0.5) + billboard.rotationOffset);
            }
        } else {
            // For other billboards, keep float animation and add horizontal wiggle
            if (billboard.hovered || billboard.expanded) {
                billboard.container.position.y += (billboard.baseY - billboard.container.position.y) * 0.1;
                billboard.container.position.x += (billboard.baseX - billboard.container.position.x) * 0.1;
            } else {
                const floatY = billboard.baseY + Math.sin(Date.now() * settings.floatSpeed + index) * 0.5;
                const wiggleX = billboard.baseX + Math.sin(Date.now() * settings.jiggleSpeed + index * 0.5) * settings.jiggleAmount;
                billboard.container.position.y += (floatY - billboard.container.position.y) * 0.1;
                billboard.container.position.x += (wiggleX - billboard.container.position.x) * 0.1;
            }
            if (billboard.hovered || billboard.expanded) {
                billboard.targetRotation = 0;
            } else {
                billboard.targetRotation = ROTATION_RANGE * Math.sin(Date.now() * (settings.rotationSpeed * 0.5) + billboard.rotationOffset);
            }
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
    buttonsRenderer.localClippingEnabled = true; // Enable local clipping
    buttonsCamera.position.z = 50;
    buttonsCamera.position.y = 5;
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    container.appendChild(buttonsRenderer.domElement);
    resize();
    window.addEventListener('resize', resize);
    Promise.all([
        loadFont('/fonts/Space%20Mono_Regular.json'),
        loadFont('/fonts/Space%20Mono_Bold.json')
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
    buttonsRenderer.domElement.addEventListener('click', async (event) => {
        console.log('Billboard clicked!');
        const rect = buttonsRenderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        pointer.x = (x / rect.width) * 2 - 1;
        pointer.y = -(y / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, buttonsCamera);
        billboards.forEach((billboard, index) => {
            if (raycaster.intersectObject(billboard.filledBox).length > 0) {
                const text = BILLBOARD_DATA[index].text;
                console.log('Billboard clicked:', text);
                
                // Handle content loading based on billboard text
                if (contentManager) {
                    if (text === 'August Graham') {
                        console.log('Dismissing content for August Graham...');
                        contentManager.dismissContent();
                    } else if (text === 'About Me') {
                        console.log('About Me clicked - no content manager action');
                            } else if (text === 'Works') {
            console.log('Loading projects.html...');
            contentManager.loadContent('projects.html');
                    } else if (text === 'Contact') {
                        console.log('Loading contact.html...');
                        contentManager.loadContent('contact.html');
                    } else if (text === 'Resume') {
                        console.log('Opening resume...');
                        window.open('https://drive.google.com/file/d/1Fgj45UGm6Unk697lO467bJZt9k7zM7cn/view?usp=sharing', '_blank');
                    }
                } else {
                    console.log('No content manager available');
                }
                
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

// Add function to set content manager
export function setContentManager(manager) {
    console.log('Billboards: setContentManager called with:', manager);
    contentManager = manager;
    console.log('Billboards: Content manager set to:', contentManager);
}

// Add function to dismiss content
export function dismissContent() {
    if (contentManager) {
        console.log('Billboards: Dismissing content...');
        contentManager.dismissContent();
    } else {
        console.log('Billboards: No content manager available for dismiss');
    }
}

export { resize }; 
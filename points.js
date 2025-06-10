import * as THREE from 'three';
import { settings } from './gui_settings.js';

let particlesScene, particlesCamera, particlesRenderer, particles = [], isColorTransitioning = false, currentColorIndex = 0;
let imageCanvas, imageContext, imageData;
let animationId;
let pointsContainer;

const PARTICLE_SIZE = 0.3;
const EASING_SPEED = 0.15;
const INTERACTION_RADIUS = 5;
const geometry = new THREE.CircleGeometry(1, 32);
const PARTICLE_COLORS = [
    new THREE.Color(0xff0000),
    new THREE.Color(0x00ff00),
    new THREE.Color(0x00ffff),
    new THREE.Color(0xff1493),
    new THREE.Color(0xffd700),
    new THREE.Color(0xff8c00),
    new THREE.Color(0x9400d3)
];

const mouse = {
    x: -10000,
    y: -10000,
    worldX: -10000,
    worldY: -10000
};

function handlePointer(event) {
    const rect = particlesRenderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        mouse.x = (x / rect.width) * 2 - 1;
        mouse.y = -(y / rect.height) * 2 + 1;
        // Convert to world coordinates
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0);
        vector.unproject(particlesCamera);
        const dir = vector.sub(particlesCamera.position).normalize();
        const distance = -particlesCamera.position.z / dir.z;
        const pos = particlesCamera.position.clone().add(dir.multiplyScalar(distance));
        mouse.worldX = pos.x;
        mouse.worldY = pos.y;
    }
}
function resetPointer() {
    mouse.x = -10000;
    mouse.y = -10000;
    mouse.worldX = -10000;
    mouse.worldY = -10000;
}

function generateParticles() {
    if (!imageData) return;
    particles = [];
    const particleSpacing = Math.max(1, Math.floor(8 * (1/settings.particleDensity)));
    const scale = 80;
    const fadeStartY = imageCanvas.height * 5/6;
    for(let y = 0; y < imageCanvas.height; y += particleSpacing) {
        for(let x = 0; x < imageCanvas.width; x += particleSpacing) {
            const i = (y * imageCanvas.width + x) * 4;
            const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 765;
            if (brightness > 0.1) {
                const particle = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: settings.particleOpacity
                }));
                const posX = (x - imageCanvas.width/2) * (scale/imageCanvas.width);
                const posY = -(y - imageCanvas.height/2) * (scale/imageCanvas.height);
                particle.position.x = posX;
                particle.position.y = posY;
                const fadeProgress = y > fadeStartY 
                    ? (y - fadeStartY) / (imageCanvas.height - fadeStartY)
                    : 0;
                const fadeOpacity = y > fadeStartY 
                    ? Math.pow(1 - fadeProgress, 1.5)
                    : 1;
                if (fadeOpacity < 0.01) continue;
                particle.originalX = posX;
                particle.originalY = posY;
                particle.originalScale = brightness * settings.particleSize;
                particle.baseOpacity = fadeOpacity;
                particle.scale.set(particle.originalScale, particle.originalScale, 1);
                particle.material.opacity = settings.particleOpacity * fadeOpacity;
                particlesScene.add(particle);
                particles.push(particle);
            }
        }
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);
    particles.forEach(particle => {
        const dx = mouse.worldX - particle.position.x;
        const dy = mouse.worldY - particle.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < settings.mouseRepulsionRadius && settings.mouseRepulsion) {
            if (settings.mouseScaling) {
                const scale = 1 + (settings.mouseScaleRadius - distance) / settings.mouseScaleRadius * settings.mouseScaleFactor;
                particle.scale.x = particle.scale.y = particle.originalScale * scale;
            }
            const angle = Math.atan2(dy, dx);
            const force = (settings.mouseRepulsionRadius - distance) * settings.mouseRepulsionForce;
            particle.position.x -= Math.cos(angle) * force;
            particle.position.y -= Math.sin(angle) * force;
        } else {
            particle.position.x += (particle.originalX - particle.position.x) * settings.returnRate;
            particle.position.y += (particle.originalY - particle.position.y) * settings.returnRate;
            particle.scale.x = particle.scale.y = particle.originalScale;
        }
        if (isColorTransitioning) {
            const targetColor = PARTICLE_COLORS[currentColorIndex];
            particle.material.color.lerp(targetColor, settings.colorTransitionSpeed);
        }
    });
    particlesRenderer.render(particlesScene, particlesCamera);
}

function resize() {
    if (!pointsContainer || !particlesRenderer || !particlesCamera) return;
    const rect = pointsContainer.getBoundingClientRect();
    particlesRenderer.setSize(rect.width, rect.height, false);
    particlesCamera.aspect = rect.width / rect.height;
    particlesCamera.updateProjectionMatrix();
}

function triggerColorChange() {
    let newColorIndex;
    do {
        newColorIndex = Math.floor(Math.random() * PARTICLE_COLORS.length);
    } while (newColorIndex === currentColorIndex);
    currentColorIndex = newColorIndex;
    isColorTransitioning = true;
}

export function initPoints(container) {
    pointsContainer = container;
    particlesScene = new THREE.Scene();
    particlesCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    particlesRenderer = new THREE.WebGLRenderer({ antialias: true });
    particlesCamera.position.z = 100;
    container.appendChild(particlesRenderer.domElement);
    resize();
    window.addEventListener('resize', resize);
    // Load image and generate particles
    const img = new window.Image();
    img.src = 'static/Headshot_1080.png';
    img.onload = function() {
        imageCanvas = document.createElement('canvas');
        imageContext = imageCanvas.getContext('2d');
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        imageContext.drawImage(img, 0, 0);
        imageData = imageContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        generateParticles();
    };
    // Pointer events
    particlesRenderer.domElement.addEventListener('mousemove', handlePointer);
    particlesRenderer.domElement.addEventListener('mousedown', handlePointer);
    particlesRenderer.domElement.addEventListener('mouseleave', resetPointer);
    particlesRenderer.domElement.addEventListener('touchmove', (event) => {
        if (event.touches.length > 0) handlePointer(event.touches[0]);
    });
    particlesRenderer.domElement.addEventListener('touchstart', (event) => {
        if (event.touches.length > 0) handlePointer(event.touches[0]);
    });
    particlesRenderer.domElement.addEventListener('touchend', resetPointer);
    particlesRenderer.domElement.addEventListener('touchcancel', resetPointer);
    animate();
}

export { resize, triggerColorChange }; 
import * as dat from 'https://cdn.skypack.dev/dat.gui';

// Scene setup for particles
const particlesScene = new THREE.Scene();
const particlesCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const particlesRenderer = new THREE.WebGLRenderer({ antialias: true });
particlesCamera.position.z = 50;

// Scene setup for buttons
const buttonsScene = new THREE.Scene();
const buttonsCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const buttonsRenderer = new THREE.WebGLRenderer({ antialias: true });
buttonsCamera.position.z = 50;

// Add renderers to containers
document.getElementById('points-container').appendChild(particlesRenderer.domElement);
document.getElementById('buttons-container').appendChild(buttonsRenderer.domElement);

// Settings object with default values
export const settings = {
    // Particle appearance
    particleSize: 0.3,
    particleOpacity: 0.8,
    particleDensity: 1.0,

    // Mouse interaction
    mouseRepulsion: true,
    mouseRepulsionRadius: 5,
    mouseRepulsionForce: 0.1,
    mouseScaling: true,
    mouseScaleRadius: 5,
    mouseScaleFactor: 1.5,

    // Animation
    colorTransitionSpeed: 0.05,
    rotationSpeed: 0.003,
    floatSpeed: 0.005
};

// Function to set up the dev panel
export function setupDevPanel() {
    const gui = new dat.GUI();
    
    // Particle appearance folder
    const appearanceFolder = gui.addFolder('Particle Appearance');
    appearanceFolder.add(settings, 'particleSize', 0.1, 1.0).name('Size');
    appearanceFolder.add(settings, 'particleOpacity', 0, 1).name('Opacity');
    appearanceFolder.add(settings, 'particleDensity', 0.1, 2).name('Density');
    appearanceFolder.open();

    // Mouse interaction folder
    const mouseFolder = gui.addFolder('Mouse Interaction');
    mouseFolder.add(settings, 'mouseRepulsion').name('Enable Repulsion');
    mouseFolder.add(settings, 'mouseRepulsionRadius', 1, 10).name('Repulsion Radius');
    mouseFolder.add(settings, 'mouseRepulsionForce', 0, 0.5).name('Repulsion Force');
    mouseFolder.add(settings, 'mouseScaling').name('Enable Scaling');
    mouseFolder.add(settings, 'mouseScaleRadius', 1, 10).name('Scale Radius');
    mouseFolder.add(settings, 'mouseScaleFactor', 0, 3).name('Scale Factor');
    mouseFolder.open();

    // Animation folder
    const animationFolder = gui.addFolder('Animation');
    animationFolder.add(settings, 'colorTransitionSpeed', 0.01, 0.2).name('Color Speed');
    animationFolder.add(settings, 'rotationSpeed', 0.001, 0.01).name('Rotation Speed');
    animationFolder.add(settings, 'floatSpeed', 0, 0.01).name('Float Speed');
    animationFolder.open();

    return gui;
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update particles and buttons...

    // Render both scenes separately
    particlesRenderer.render(particlesScene, particlesCamera);
    buttonsRenderer.render(buttonsScene, buttonsCamera);
} 
import * as dat from 'https://cdn.skypack.dev/dat.gui';

// Settings object with default values
export const settings = {
    // Particle appearance
    particleSize: 0.3,
    particleOpacity: 0.8,
    particleDensity: 1.0,

    // Mouse interaction
    mouseRepulsion: true,
    mouseRepulsionRadius: 6,
    mouseRepulsionForce: 0.1,
    mouseScaling: true,
    mouseScaleRadius: 5,
    mouseScaleFactor: 1.5,
    
    // Animation
    colorTransitionSpeed: 0.05,
    rotationSpeed: 0.003,
    floatSpeed: 0.0007,

    // Camera zoom settings (desktop = landscape, mobile = portrait)
    desktopZoom: 2,  // Used when width > height
    mobileZoom: 1.0,    // Used when width <= height
    showBorders: true,   // Global border toggle
    returnRate: 0.1,      // Rate at which points return to original position
    // About Me billboard animation settings
    aboutMeExpandedHeight: 25,
    aboutMeCollapsedRadius: .01,
    aboutMeExpandedRadius: 1,
    aboutMeAnimationSpeed: 0.15
};

// Function to set up the dev panel
export function setupDevPanel() {
    const gui = new dat.GUI({ width: 300 });
    
    // Particle appearance folder
    const appearanceFolder = gui.addFolder('Particle Appearance');
    appearanceFolder.add(settings, 'particleSize', 0.1, 1.0).name('Size');
    appearanceFolder.add(settings, 'particleOpacity', 0, 1).name('Opacity');
    appearanceFolder.add(settings, 'particleDensity', 0.1, 2).name('Density');
    appearanceFolder.add(settings, 'returnRate', 0.01, 0.5).name('Return Rate');
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

    // Camera zoom folder
    const zoomFolder = gui.addFolder('Camera Zoom');
    zoomFolder.add(settings, 'desktopZoom', 0.5, 2.0)
        .name('Landscape Zoom (width > height)')
        .onChange(() => window.resizePoints && window.resizePoints());
    zoomFolder.add(settings, 'mobileZoom', 0.5, 2.0)
        .name('Portrait Zoom (width <= height)')
        .onChange(() => window.resizePoints && window.resizePoints());
    zoomFolder.open();

    // Global folder
    const globalFolder = gui.addFolder('Global');
    globalFolder.add(settings, 'showBorders').name('Show Borders').onChange((value) => {
        if (value) {
            document.body.classList.add('show-borders');
        } else {
            document.body.classList.remove('show-borders');
        }
    });
    globalFolder.open();

    // About Me Animation folder
    const aboutMeFolder = gui.addFolder('About Me Animation');
    aboutMeFolder.add(settings, 'aboutMeExpandedHeight', 0, 50).name('Expanded Height');
    aboutMeFolder.add(settings, 'aboutMeCollapsedRadius', 0, 5).name('Collapsed Radius');
    aboutMeFolder.add(settings, 'aboutMeExpandedRadius', 0, 10).name('Expanded Radius');
    aboutMeFolder.add(settings, 'aboutMeAnimationSpeed', 0.01, 0.5).name('Animation Speed');
    aboutMeFolder.open();

    return gui;
} 
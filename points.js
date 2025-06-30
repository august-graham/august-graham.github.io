import * as THREE from 'three';
import { settings, DEV_MODE } from './gui_settings.js';

let particlesScene, particlesCamera, particlesRenderer, particles = [], isColorTransitioning = false, currentColorIndex = 0;
let imageCanvas = document.createElement('canvas');
let imageContext = imageCanvas.getContext('2d');
let imageData = null;
let animationId;
let pointsContainer;
let pointer = { x: 0, y: 0, isDown: false };
let lastPointer = { x: 0, y: 0 };
let isExiting = false;
let isEntering = false;
let exitProgress = 0;
let enterProgress = 0;
let debugDisplay;
let onExitComplete = null; // Callback for when exit animation completes

const PARTICLE_SIZE = 0.3;
const EASING_SPEED = 0.15;
const INTERACTION_RADIUS = 5;
const geometry = new THREE.CircleGeometry(1, 32);

// Color constants
const PARTICLE_COLORS = [
    new THREE.Color(0xff0000),
    new THREE.Color(0x00ff00),
    new THREE.Color(0x00ffff),
    new THREE.Color(0xff1493),
    new THREE.Color(0xffd700),
    new THREE.Color(0xff8c00),
    new THREE.Color(0x9400d3)
];
const WHITE_COLOR = new THREE.Color(0xffffff);
const ELECTRIC_BLUE = new THREE.Color(0x00ffff); // Electric blue color
const GREEN_COLOR = new THREE.Color(0x00ff00); // Green color for transition

const mouse = {
    x: -10000,
    y: -10000,
    worldX: -10000,
    worldY: -10000
};

// Easing function
function easeInOutExpo(x) {
    return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 
        ? Math.pow(2, 20 * x - 10) / 2 
        : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

// Replace with simpler cubic easing
function easeInOutCubic(x) {
    return x < 0.5 
        ? 4 * x * x * x 
        : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Function to convert HSL to RGB
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r, g, b;
    if (h < 1/6) {
        r = c; g = x; b = 0;
    } else if (h < 2/6) {
        r = x; g = c; b = 0;
    } else if (h < 3/6) {
        r = 0; g = c; b = x;
    } else if (h < 4/6) {
        r = 0; g = x; b = c;
    } else if (h < 5/6) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }
    
    return new THREE.Color(r + m, g + m, b + m);
}

// Function to get current colors from settings
function getFullColor() {
    return hslToRgb(settings.fullColorHue, settings.fullColorSaturation, 50);
}

function getTransitionColor() {
    return hslToRgb(settings.transitionColorHue, settings.transitionColorSaturation, 50);
}

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
    if (!imageData || !imageData.height) {
        console.warn('No valid image data available for particle generation');
        return;
    }

    console.log('Generating particles from image data:', imageData.width, 'x', imageData.height);
    
    // Clear existing particles
    particles.forEach(particle => {
        particlesScene.remove(particle);
    });
    particles = [];

    const particleSpacing = Math.max(1, Math.floor(8 * (1/settings.particleDensity)));
    const scale = 80;
    const fadeStartY = imageCanvas.height * 5/6;
    
    for(let y = 0; y < imageCanvas.height; y += particleSpacing) {
        for(let x = 0; x < imageCanvas.width; x += particleSpacing) {
            const i = (y * imageCanvas.width + x) * 4;
            const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 765;
            if (brightness > 0.1) {
                const particle = new THREE.Mesh(
                    new THREE.CircleGeometry(1, 32),
                    new THREE.MeshBasicMaterial({
                        color: WHITE_COLOR,
                        transparent: true,
                        opacity: settings.particleOpacity
                    })
                );
                
                const posX = (x - imageCanvas.width/2) * (scale/imageCanvas.width);
                const posY = -(y - imageCanvas.height/2) * (scale/imageCanvas.height);
                
                // Add jiggle properties
                particle.jiggleOffset = Math.random() * Math.PI * 2;
                particle.jiggleSpeed = 0.8 + Math.random() * 0.4;
                
                // Calculate initial jiggle position
                const jiggleAmount = isEntering ? 6 : settings.jiggleAmount;
                const jiggleX = Math.sin(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * jiggleAmount;
                const jiggleY = Math.cos(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * jiggleAmount;
                
                particle.position.set(posX + jiggleX, posY + jiggleY, 0);
                
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
                particle.lastInteractionTime = 0;
                particle.isDisplaced = false;
                particle.isTransitioning = false;
                particle.isBeingTouched = false;
                particle.targetColor = WHITE_COLOR.clone();
                
                particlesScene.add(particle);
                particles.push(particle);
            }
        }
    }
    
    console.log('Generated', particles.length, 'particles');
}

function triggerExit() {
    isExiting = true;
    exitProgress = 0;
}

function setExitCompleteCallback(callback) {
    onExitComplete = callback;
}

function triggerEnter() {
    if (!isExiting && !isEntering) {
        isEntering = true;
        enterProgress = 0;
        generateParticles();
    }
}

function updateDebugDisplay(jiggleAmount, scale) {
    // Only show debug display if DEV_MODE is enabled
    if (!DEV_MODE) {
        // Remove debug display if it exists and DEV_MODE is disabled
        if (debugDisplay) {
            debugDisplay.remove();
            debugDisplay = null;
        }
        return;
    }

    if (!debugDisplay) {
        debugDisplay = document.createElement('div');
        debugDisplay.style.position = 'fixed';
        debugDisplay.style.top = '10px';
        debugDisplay.style.left = '10px';
        debugDisplay.style.background = 'rgba(0, 0, 0, 0.7)';
        debugDisplay.style.color = 'white';
        debugDisplay.style.padding = '10px';
        debugDisplay.style.fontFamily = 'monospace';
        debugDisplay.style.fontSize = '12px';
        debugDisplay.style.zIndex = '1000';
        document.body.appendChild(debugDisplay);
    }
    debugDisplay.innerHTML = `
        Jiggle Amount: ${jiggleAmount.toFixed(2)}<br>
        Points Radius: ${scale.toFixed(2)}
    `;
}

function animate() {
    animationId = requestAnimationFrame(animate);
    const dt = 1/60; // Assume 60fps for simplicity
    const currentTime = Date.now() / 1000; // Current time in seconds

    if (isExiting) {
        exitProgress += dt / settings.animationDuration;
        const t = Math.min(1, exitProgress);
        const easedT = easeInOutCubic(t * settings.animationSmoothness);

        particles.forEach(particle => {
            // Calculate jiggle amount - lerp from normal to 6
            const jiggleAmount = settings.jiggleAmount * (1 - easedT) + (6 * easedT);
            const jiggleX = Math.sin(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * jiggleAmount;
            const jiggleY = Math.cos(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * jiggleAmount;
            
            // Scale animation - linear lerp from original scale to 0
            const targetScale = particle.originalScale * (1 - t);
            particle.scale.x = particle.scale.y = targetScale;

            // Position animation with jiggle - smoothly interpolate to target position
            const targetX = particle.originalX + jiggleX;
            const targetY = particle.originalY + jiggleY;
            particle.position.x += (targetX - particle.position.x) * settings.returnRate;
            particle.position.y += (targetY - particle.position.y) * settings.returnRate;

            // Update debug display with first particle's values
            if (particle === particles[0]) {
                updateDebugDisplay(jiggleAmount, targetScale);
            }
        });

        if (t >= 1) {
            // Clear particles after exit animation completes
            particles.forEach(particle => {
                particlesScene.remove(particle);
            });
            particles = [];
            isExiting = false;
            if (onExitComplete) {
                onExitComplete();
            }
        }
    } else if (isEntering) {
        enterProgress += dt / settings.animationDuration;
        const t = Math.min(1, enterProgress);
        const easedT = easeInOutCubic(t * settings.animationSmoothness);

        particles.forEach(particle => {
            // Calculate jiggle amount - lerp from 6 to normal
            const jiggleAmount = (6 * (1 - easedT)) + (settings.jiggleAmount * easedT);
            const jiggleX = Math.sin(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * jiggleAmount;
            const jiggleY = Math.cos(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * jiggleAmount;
            
            // Scale animation - linear lerp from 0 to original scale
            const targetScale = particle.originalScale * t;
            particle.scale.x = particle.scale.y = targetScale;

            // Position animation with jiggle - directly set position to avoid overshooting
            const targetX = particle.originalX + jiggleX;
            const targetY = particle.originalY + jiggleY;
            particle.position.x = targetX;
            particle.position.y = targetY;

            // Update debug display with first particle's values
            if (particle === particles[0]) {
                updateDebugDisplay(jiggleAmount, targetScale);
            }
        });

        if (t >= 1) {
            isEntering = false;
        }
    } else {
        // Normal animation state
        particles.forEach(particle => {
            // Calculate jiggle offset
            const jiggleX = Math.sin(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * settings.jiggleAmount;
            const jiggleY = Math.cos(Date.now() * settings.jiggleSpeed * particle.jiggleSpeed + particle.jiggleOffset) * settings.jiggleAmount;
            
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
                
                // Check if particle is being touched for the first time
                if (!particle.isBeingTouched) {
                    // Change color to full color (electric blue by default)
                    const fullColor = getFullColor();
                    particle.targetColor.copy(fullColor);
                    particle.material.color.copy(fullColor);
                    particle.isBeingTouched = true;
                    particle.isTransitioning = false;
                }
                
                particle.lastInteractionTime = currentTime;
                particle.isDisplaced = true;
            } else {
                // Add jiggle to the return position
                const targetX = particle.originalX + jiggleX;
                const targetY = particle.originalY + jiggleY;
                const dx = targetX - particle.position.x;
                const dy = targetY - particle.position.y;
                const distanceToRest = Math.sqrt(dx * dx + dy * dy);
                
                particle.position.x += dx * settings.returnRate;
                particle.position.y += dy * settings.returnRate;
                particle.scale.x = particle.scale.y = particle.originalScale;

                // If particle was being touched and is now not touched, start transition to white
                if (particle.isBeingTouched) {
                    particle.isBeingTouched = false;
                    particle.isTransitioning = true;
                    particle.transitionStage = 0; // 0 = full color to transition color, 1 = transition color to white
                    particle.startColor = getFullColor();
                    particle.midColor = getTransitionColor();
                    particle.targetColor = WHITE_COLOR.clone();
                    particle.lastInteractionTime = currentTime;
                }
            }

            // Handle color transition back to white
            if (particle.isTransitioning) {
                const timeSinceInteraction = currentTime - particle.lastInteractionTime;
                const colorTransitionDuration = settings.colorReturnTime || 1.0; // Default to 1 second if not set
                const stageDuration = colorTransitionDuration / 2; // Split transition into two equal stages
                
                if (timeSinceInteraction < colorTransitionDuration) {
                    // Calculate color transition progress
                    const colorProgress = timeSinceInteraction / colorTransitionDuration;
                    
                    if (particle.transitionStage === 0) {
                        // Stage 0: Full color to transition color
                        const stageProgress = Math.min(1, timeSinceInteraction / stageDuration);
                        const currentFullColor = getFullColor();
                        const currentTransitionColor = getTransitionColor();
                        particle.material.color.lerpColors(currentFullColor, currentTransitionColor, stageProgress);
                        
                        // Move to next stage when first stage is complete
                        if (stageProgress >= 1) {
                            particle.transitionStage = 1;
                            particle.lastInteractionTime = currentTime - stageDuration; // Adjust time for second stage
                        }
                    } else {
                        // Stage 1: Transition color to white
                        const stageProgress = Math.min(1, (timeSinceInteraction - stageDuration) / stageDuration);
                        const currentTransitionColor = getTransitionColor();
                        particle.material.color.lerpColors(currentTransitionColor, particle.targetColor, stageProgress);
                    }
                } else {
                    // Ensure color is exactly the target color after transition
                    particle.material.color.copy(particle.targetColor);
                    particle.isTransitioning = false;
                }
            }

            // Update debug display with first particle's values
            if (particle === particles[0]) {
                updateDebugDisplay(settings.jiggleAmount, particle.scale.x);
            }
        });
    }
    particlesRenderer.render(particlesScene, particlesCamera);
}

function resize() {
    if (!pointsContainer || !particlesRenderer || !particlesCamera) return;
    const rect = pointsContainer.getBoundingClientRect();
    particlesRenderer.setSize(rect.width, rect.height, false);
    particlesCamera.aspect = rect.width / rect.height;
    particlesCamera.updateProjectionMatrix();
}

export function initPoints(container) {
    pointsContainer = container;
    particlesScene = new THREE.Scene();
    particlesScene.background = new THREE.Color(0x000000);
    particlesCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    particlesRenderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    particlesCamera.position.z = 90;
    particlesCamera.position.y = 5;
    container.appendChild(particlesRenderer.domElement);
    resize();
    
    // Load image and generate particles
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = '/static/Headshot_1080.png';
    img.onload = function() {
        console.log('Image loaded successfully');
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        imageContext.drawImage(img, 0, 0);
        imageData = imageContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        generateParticles();
        // Trigger enter animation after 0.5 seconds
        setTimeout(triggerEnter, 500);
    };
    img.onerror = function(err) {
        console.error('Error loading image:', err);
    };

    // Add event listener for enter animation
    window.addEventListener('pointsEnter', triggerEnter);

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

    // Handle window resize
    window.addEventListener('resize', resize);
    
    animate();
}

export { handlePointer, resetPointer, resize, triggerExit, triggerEnter, setExitCompleteCallback }; 
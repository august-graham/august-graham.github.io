import { triggerExit, triggerEnter, setExitCompleteCallback } from './points.js';

class ContentManager {
    constructor(pointsContainer) {
        this.pointsContainer = pointsContainer;
        this.currentContent = null;
        this.contentCache = new Map();
        this.isTransitioning = false;
        this.transitionDuration = 500; // milliseconds
        this.pointsVisible = true; // Track if points are currently visible
        
        // Create overlay container for HTML content
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.style.position = 'absolute';
        this.overlayContainer.style.top = '0';
        this.overlayContainer.style.left = '0';
        this.overlayContainer.style.width = '100%';
        this.overlayContainer.style.height = '100%';
        this.overlayContainer.style.zIndex = '1000';
        this.overlayContainer.style.opacity = '0';
        this.overlayContainer.style.pointerEvents = 'none';
        this.overlayContainer.style.overflow = 'auto';
        this.overlayContainer.style.padding = '20px';
        this.overlayContainer.style.boxSizing = 'border-box';
        
        // Ensure points container has relative positioning
        this.pointsContainer.style.position = 'relative';
        
        // Append overlay to points container
        this.pointsContainer.appendChild(this.overlayContainer);
        
        console.log('ContentManager initialized with container:', pointsContainer);
        console.log('Overlay container created:', this.overlayContainer);
    }

    // Load content from an HTML file
    async loadContent(htmlFile) {
        console.log('ContentManager.loadContent called with:', htmlFile);
        if (this.isTransitioning) {
            console.log('Already transitioning, ignoring request');
            return;
        }
        
        try {
            this.isTransitioning = true;
            console.log('Starting content transition...');
            
            // If points are visible, trigger exit animation and wait for it to complete
            if (this.pointsVisible) {
                console.log('Points are visible, triggering exit animation...');
                
                // Create a promise that resolves when exit animation completes
                const exitPromise = new Promise((resolve) => {
                    setExitCompleteCallback(() => {
                        console.log('Exit animation completed, resolving promise');
                        resolve();
                        setExitCompleteCallback(null); // Clear the callback
                    });
                });
                
                triggerExit();
                this.pointsVisible = false;
                
                // Wait for exit animation to complete
                console.log('Waiting for exit animation to complete...');
                await exitPromise;
                console.log('Exit animation completed, proceeding with content load');
            }
            
            // If there's current content, fade it out first
            if (this.currentContent && this.overlayContainer.style.opacity !== '0') {
                console.log('Fading out current content...');
                await this.fadeOut();
            }
            
            // Load the content
            console.log('Fetching content from:', htmlFile);
            const content = await this.fetchContent(htmlFile);
            console.log('Content fetched successfully, length:', content.length);
            
            // Replace the content
            console.log('Replacing overlay content...');
            this.overlayContainer.innerHTML = content;
            console.log('Content replaced successfully');
            
            // Scroll to top before transition starts
            this.overlayContainer.scrollTop = 0;
            
            // Add click outside to close
            this.overlayContainer.addEventListener('click', (e) => {
                if (e.target === this.overlayContainer) {
                    this.dismissContent();
                }
            });
            
            // Start fade in
            console.log('Starting fade in...');
            await this.fadeIn();
            
            this.currentContent = htmlFile;
            this.isTransitioning = false;
            console.log('Content transition completed successfully');
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.isTransitioning = false;
        }
    }

    // Fetch content from HTML file
    async fetchContent(htmlFile) {
        console.log('fetchContent called with:', htmlFile);
        // Check cache first
        if (this.contentCache.has(htmlFile)) {
            console.log('Content found in cache');
            return this.contentCache.get(htmlFile);
        }

        try {
            console.log('Fetching from server:', htmlFile);
            const response = await fetch(htmlFile);
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const content = await response.text();
            console.log('Raw content length:', content.length);
            
            // Extract body content from HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const bodyContent = doc.body.innerHTML;
            console.log('Extracted body content length:', bodyContent.length);
            
            // Add CSS styles directly to ensure white text
            const styledContent = `
                <style>
                    .projects-section {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: white !important;
                    }
                    .projects-section h1 {
                        text-align: center;
                        font-size: 2.5rem;
                        margin-bottom: 30px;
                        color: white !important;
                    }
                    .projects-section p {
                        font-size: 1.1rem;
                        color: white !important;
                        margin-bottom: 20px;
                    }
                    .projects-section strong {
                        color: white !important;
                    }
                    .projects-section a {
                        color: #4fc3f7 !important;
                        text-decoration: none;
                        transition: color 0.3s ease;
                    }
                    .projects-section a:hover {
                        color: #81d4fa !important;
                        text-decoration: underline;
                    }
                    * {
                        color: white !important;
                    }
                </style>
                ${bodyContent}
            `;
            
            // Cache the content
            this.contentCache.set(htmlFile, styledContent);
            console.log('Content cached successfully');
            
            return styledContent;
        } catch (error) {
            console.error(`Failed to load ${htmlFile}:`, error);
            return `<div style="padding: 20px; color: white; text-align: center;">
                <h2>Error Loading Content</h2>
                <p>Failed to load: ${htmlFile}</p>
                <p>${error.message}</p>
            </div>`;
        }
    }

    // Fade in overlay
    async fadeIn() {
        console.log('fadeIn called');
        return new Promise((resolve) => {
            this.overlayContainer.style.pointerEvents = 'auto';
            this.overlayContainer.style.transition = `opacity ${this.transitionDuration}ms ease-in`;
            this.overlayContainer.style.opacity = '1';
            console.log('Fade in transition started');
            
            setTimeout(() => {
                console.log('Fade in completed');
                resolve();
            }, this.transitionDuration);
        });
    }

    // Fade out overlay
    async fadeOut() {
        console.log('fadeOut called');
        return new Promise((resolve) => {
            this.overlayContainer.style.transition = `opacity ${this.transitionDuration}ms ease-out`;
            this.overlayContainer.style.opacity = '0';
            console.log('Fade out transition started');
            
            setTimeout(() => {
                this.overlayContainer.style.pointerEvents = 'none';
                console.log('Fade out completed');
                resolve();
            }, this.transitionDuration);
        });
    }

    // Dismiss content (fade out without loading new content)
    async dismissContent() {
        console.log('dismissContent called');
        if (this.isTransitioning) {
            console.log('Already transitioning, ignoring dismiss request');
            return;
        }
        
        if (this.currentContent && this.overlayContainer.style.opacity !== '0') {
            this.isTransitioning = true;
            console.log('Dismissing current content...');
            await this.fadeOut();
            this.currentContent = null;
            
            // If points were not visible, trigger enter animation
            if (!this.pointsVisible) {
                console.log('Points were not visible, triggering enter animation...');
                triggerEnter();
                this.pointsVisible = true;
            }
            
            this.isTransitioning = false;
            console.log('Content dismissed successfully');
        }
    }

    // Get current content file
    getCurrentContent() {
        return this.currentContent;
    }

    // Check if currently transitioning
    isCurrentlyTransitioning() {
        return this.isTransitioning;
    }
}

export { ContentManager }; 
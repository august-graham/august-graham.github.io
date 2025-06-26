class Button {
  constructor(x, y, width, height, headerText, bodyText = null, link = null, contentFile = null, contentManager = null) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.headerText = headerText;
    this.bodyText = bodyText;
    this.link = link;
    this.contentFile = contentFile; // New: HTML file to load
    this.contentManager = contentManager; // New: Reference to content manager
    this.isExpanded = false;
    this.expandedHeight = height * 2; // Double height when expanded
    this.currentHeight = height;
    this.animationSpeed = 0.05;
    this.cornerRadius = 10;
    this.padding = 10;
    this.targetY = y; // Target Y position for smooth animation
  }

  draw() {
    // Smoothly animate Y position
    this.y = lerp(this.y, this.targetY, this.animationSpeed);

    // Draw button background
    fill(0);
    stroke(255);
    strokeWeight(2);
    rect(this.x, this.y, this.width, this.currentHeight, this.cornerRadius);

    // Draw header text
    fill(255);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(16);
    text(this.headerText, this.x + this.padding, this.y + this.currentHeight/2);

    // Draw body text if expanded
    if (this.isExpanded && this.bodyText) {
      fill(255);
      textSize(14);
      textAlign(LEFT, TOP);
      // Create a graphics buffer for text clipping
      let buffer = createGraphics(this.width - 2 * this.padding, this.currentHeight - this.height - 2 * this.padding);
      buffer.background(0);
      buffer.fill(255);
      buffer.textSize(14);
      buffer.textAlign(LEFT, TOP);
      buffer.text(this.bodyText, 0, 0);
      image(buffer, this.x + this.padding, this.y + this.height + this.padding);
    }

    // Animate height
    if (this.isExpanded) {
      this.currentHeight = lerp(this.currentHeight, this.expandedHeight, this.animationSpeed);
    } else {
      this.currentHeight = lerp(this.currentHeight, this.height, this.animationSpeed);
    }
  }

  isMouseOver() {
    return mouseX > this.x && mouseX < this.x + this.width &&
           mouseY > this.y && mouseY < this.y + this.currentHeight;
  }

  async handleClick() {
    console.log('Button clicked:', this.headerText);
    if (this.isMouseOver()) {
      console.log('Mouse is over button, processing click...');
      if (this.link) {
        console.log('Opening link:', this.link);
        window.open(this.link, '_blank');
      } else if (this.contentFile && this.contentManager) {
        console.log('Loading content file:', this.contentFile);
        console.log('Content manager available:', !!this.contentManager);
        // Load content file
        await this.contentManager.loadContent(this.contentFile);
      } else if (this.bodyText) {
        console.log('Toggling button expansion');
        this.isExpanded = !this.isExpanded;
        // Trigger repositioning of all buttons
        repositionButtons();
      } else {
        console.log('No action defined for this button');
      }
    } else {
      console.log('Mouse not over button, ignoring click');
    }
  }
}

// Global array to store all buttons
let buttons = [];
let contentManager = null;

function setup() {
  const buttonsContainer = document.getElementById('buttons-container');
  const canvas = createCanvas(buttonsContainer.offsetWidth, buttonsContainer.offsetHeight);
  canvas.parent('buttons-container');
  
  // Create the four specified buttons
  const buttonWidth = 300;
  const buttonHeight = 50;
  const startX = (width - buttonWidth) / 2;  // Center buttons horizontally
  const startY = 50;  // Start from top with some padding
  const spacing = 70;  // Space between buttons

  buttons.push(new Button(startX, startY, buttonWidth, buttonHeight, "August Graham", "Welcome to my portfolio website. I'm a passionate developer and creative technologist."));
  buttons.push(new Button(startX, startY + spacing, buttonWidth, buttonHeight, "About", "I specialize in creating innovative digital experiences and solutions. With expertise in web development, interactive design, and creative coding, I bring ideas to life through technology.", null, "about.html", contentManager));
  buttons.push(new Button(startX, startY + spacing * 2, buttonWidth, buttonHeight, "Projects", "Explore my portfolio of work including web applications, interactive installations, and creative coding projects. Each project showcases different aspects of my technical and creative skills.", null, "projects.html", contentManager));
  buttons.push(new Button(startX, startY + spacing * 3, buttonWidth, buttonHeight, "Contact", null, "mailto:your.email@example.com", "contact.html", contentManager));
}

function draw() {
  background(0);  // Black background to match container
  
  // Draw and update all buttons
  for (let button of buttons) {
    button.draw();
  }
}

function windowResized() {
  const buttonsContainer = document.getElementById('buttons-container');
  resizeCanvas(buttonsContainer.offsetWidth, buttonsContainer.offsetHeight);
}

// Function to reposition all buttons
function repositionButtons() {
  let currentY = 50; // Starting Y position
  const spacing = 70; // Base spacing between buttons

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    button.targetY = currentY;
    
    // Move to next position
    currentY += button.isExpanded ? button.expandedHeight + spacing : button.height + spacing;
  }
}

// Function to set content manager reference
function setContentManager(manager) {
  console.log('setContentManager called with:', manager);
  contentManager = manager;
  console.log('Content manager set to:', contentManager);
  // Update buttons that need content manager
  buttons.forEach((button, index) => {
    if (button.contentFile) {
      console.log(`Updating button ${index} (${button.headerText}) with content manager`);
      button.contentManager = contentManager;
    }
  });
  console.log('All buttons updated with content manager');
}

// Make setContentManager available globally
window.setContentManager = setContentManager;

// Handle mouse clicks
async function mousePressed() {
  for (let button of buttons) {
    await button.handleClick();
  }
}

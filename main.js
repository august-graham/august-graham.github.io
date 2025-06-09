// Modified version of antimatter15/splat main.js
let currentUrl = 'static/Headshot.ply';

// Rest of the code will be fetched from their repository
fetch('https://antimatter15.com/splat/main.js')
    .then(response => response.text())
    .then(code => {
        // Replace the default URL with our PLY file
        code = code.replace(/let currentUrl = '[^']*';/, `let currentUrl = '${currentUrl}';`);
        
        // Create a blob and load it as a script
        const blob = new Blob([code], { type: 'application/javascript' });
        const script = document.createElement('script');
        script.src = URL.createObjectURL(blob);
        document.head.appendChild(script);
    }); 
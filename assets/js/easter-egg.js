// Konami Code: up up down down left right left right
const KONAMI_CODE = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight'
];

// BSD easter egg: type 'bsd'
const BSD_CODE = ['b', 's', 'd'];

let konamiIndex = 0;
let bsdIndex = 0;
let nes = null;
let audioContext = null;
let frameId = null;

// Listen for Konami code and BSD easter egg
document.addEventListener('keydown', (e) => {
    if (document.getElementById('emulator-modal').classList.contains('active') ||
        document.getElementById('v86-modal').classList.contains('active')) {
        return; // Don't track codes when any emulator is active
    }
    
    // Use e.key for letter keys, e.code for arrow keys
    const key = e.code.startsWith('Arrow') ? e.code : e.key.toLowerCase();
    
    // Check for BSD easter egg (letter keys only)
    if (!e.code.startsWith('Arrow')) {
        const letterKey = e.key.toLowerCase();
        if (letterKey === BSD_CODE[bsdIndex]) {
            bsdIndex++;
            if (bsdIndex === BSD_CODE.length) {
                console.log('🐡 BSD EASTER EGG ACTIVATED!');
                bsdIndex = 0;
                launchFreeBSD();
                return;
            }
        } else {
            if (letterKey === BSD_CODE[0]) {
                bsdIndex = 1;
            } else {
                bsdIndex = 0;
            }
        }
    }
    
    // Check for Konami code
    if (key === KONAMI_CODE[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === KONAMI_CODE.length) {
            console.log('🎮 KONAMI CODE ACTIVATED!');
            konamiIndex = 0;
            launchEmulator();
        }
    } else {
        if (key === KONAMI_CODE[0]) {
            konamiIndex = 1;
        } else {
            konamiIndex = 0;
        }
    }
});

async function launchEmulator() {
    const modal = document.getElementById('emulator-modal');
    modal.classList.add('active');
    
    // Initialize audio context (must be done after user interaction)
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    const canvas = document.getElementById('nes-canvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(256, 240);
    
    // Audio setup
    const SAMPLE_RATE = 44100;
    const BUFFER_SIZE = 4096;
    let audioBuffer = [];
    
    // Create script processor for audio
    const scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 0, 1);
    scriptProcessor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        const samplesNeeded = output.length;
        
        for (let i = 0; i < samplesNeeded; i++) {
            if (audioBuffer.length > 0) {
                output[i] = audioBuffer.shift();
            } else {
                output[i] = 0;
            }
        }
    };
    scriptProcessor.connect(audioContext.destination);
    
    // Initialize NES
    nes = new jsnes.NES({
        onFrame: function(frameBuffer) {
            for (let i = 0; i < 256 * 240; i++) {
                imageData.data[i * 4] = frameBuffer[i] & 0xFF;
                imageData.data[i * 4 + 1] = (frameBuffer[i] >> 8) & 0xFF;
                imageData.data[i * 4 + 2] = (frameBuffer[i] >> 16) & 0xFF;
                imageData.data[i * 4 + 3] = 0xFF;
            }
            ctx.putImageData(imageData, 0, 0);
        },
        onAudioSample: function(left, right) {
            // Mix stereo to mono and add to buffer
            const sample = (left + right) / 2;
            if (audioBuffer.length < SAMPLE_RATE) {
                audioBuffer.push(sample);
            }
        },
        sampleRate: SAMPLE_RATE
    });
    
    // Load ROM - use baseurl-aware path
    try {
        const basePath = document.querySelector('script[src*="easter-egg.js"]').src.replace('/assets/js/easter-egg.js', '');
        const response = await fetch(basePath + '/assets/game.nes');
        const arrayBuffer = await response.arrayBuffer();
        const romData = new Uint8Array(arrayBuffer);
        
        // Convert to binary string
        let binaryString = '';
        for (let i = 0; i < romData.length; i++) {
            binaryString += String.fromCharCode(romData[i]);
        }
        
        nes.loadROM(binaryString);
        
        // Start game loop
        function frame() {
            nes.frame();
            frameId = requestAnimationFrame(frame);
        }
        frame();
        
    } catch (error) {
        console.error('Failed to load ROM:', error);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Failed to load game.nes', 128, 120);
    }
    
    // Add keyboard controls for emulator
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(e) {
    if (!nes) return;
    
    const keyMap = {
        'ArrowUp': [1, jsnes.Controller.BUTTON_UP],
        'ArrowDown': [1, jsnes.Controller.BUTTON_DOWN],
        'ArrowLeft': [1, jsnes.Controller.BUTTON_LEFT],
        'ArrowRight': [1, jsnes.Controller.BUTTON_RIGHT],
        'KeyZ': [1, jsnes.Controller.BUTTON_A],
        'KeyX': [1, jsnes.Controller.BUTTON_B],
        'Enter': [1, jsnes.Controller.BUTTON_START],
        'ShiftRight': [1, jsnes.Controller.BUTTON_SELECT],
        'ShiftLeft': [1, jsnes.Controller.BUTTON_SELECT]
    };
    
    if (keyMap[e.code]) {
        nes.buttonDown(...keyMap[e.code]);
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    if (!nes) return;
    
    const keyMap = {
        'ArrowUp': [1, jsnes.Controller.BUTTON_UP],
        'ArrowDown': [1, jsnes.Controller.BUTTON_DOWN],
        'ArrowLeft': [1, jsnes.Controller.BUTTON_LEFT],
        'ArrowRight': [1, jsnes.Controller.BUTTON_RIGHT],
        'KeyZ': [1, jsnes.Controller.BUTTON_A],
        'KeyX': [1, jsnes.Controller.BUTTON_B],
        'Enter': [1, jsnes.Controller.BUTTON_START],
        'ShiftRight': [1, jsnes.Controller.BUTTON_SELECT],
        'ShiftLeft': [1, jsnes.Controller.BUTTON_SELECT]
    };
    
    if (keyMap[e.code]) {
        nes.buttonUp(...keyMap[e.code]);
        e.preventDefault();
    }
}

function closeEmulator() {
    const modal = document.getElementById('emulator-modal');
    modal.classList.remove('active');
    
    // Stop the game loop
    if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    // Reset NES
    nes = null;
}

// FreeBSD v86 emulator functions using iframe
function launchFreeBSD() {
    const modal = document.getElementById('v86-modal');
    modal.classList.add('active');
    
    const frame = document.getElementById('v86-frame');
    
    // Load FreeBSD from copy.sh hosted emulator
    // Only load once to avoid restarting the emulator each time
    if (!frame.src || frame.src === 'about:blank') {
        frame.src = 'https://copy.sh/v86/?profile=freebsd';
    }
}

function closeV86() {
    const modal = document.getElementById('v86-modal');
    modal.classList.remove('active');
}

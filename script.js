let apiKey = '';
let isConnected = false;

// DOM Elements
const apiKeyInput = document.getElementById('apiKeyInput');
const apiStatus = document.getElementById('apiStatus');
const connectButton = document.getElementById('connectButton');
const promptInput = document.getElementById('promptInput');
const generateButton = document.getElementById('generateButton');
const fileList = document.getElementById('fileList');
const codeDisplay = document.getElementById('codeDisplay');
const copyButton = document.getElementById('copyButton');
const refreshButton = document.getElementById('refreshButton');
const previewFrame = document.getElementById('previewFrame');
const currentFileSpan = document.querySelector('.current-file');

// File content storage
let fileContents = {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Generated Component</title>
    <style></style>
</head>
<body>
    <div id="app"></div>
    <script></script>
</body>
</html>`,
    'styles.css': `/* Styles will be generated here */`,
    'script.js': `// JavaScript will be generated here`
};

// Current file tracking
let currentFile = 'index.html';

// Initialize highlight.js
hljs.highlightAll();

// API Connection handling
async function testApiConnection(key) {
    try {
        const response = await fetch(CONFIG.API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': CONFIG.API_VERSION
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: 'Say "Connected successfully" if you can read this message.'
                }]
            })
        });

        if (response.ok) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('API Connection error:', error);
        return false;
    }
}

async function connectToApi() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        alert('Please enter an API key');
        return;
    }

    connectButton.textContent = 'Connecting...';
    const success = await testApiConnection(key);

    if (success) {
        apiKey = key;
        isConnected = true;
        apiStatus.textContent = '🟢 Connected';
        apiStatus.style.color = 'var(--success-color)';
        promptInput.disabled = false;
        generateButton.disabled = false;
        connectButton.textContent = 'Connected';
        connectButton.disabled = true;
        localStorage.setItem('claude_api_key', key);
    } else {
        apiStatus.textContent = '🔴 Connection Failed';
        apiStatus.style.color = 'var(--error-color)';
        connectButton.textContent = 'Connect';
        alert('Failed to connect. Please check your API key and try again.');
    }
}

// Code generation using Claude API
async function generateCode(prompt) {
    if (!isConnected) {
        alert('Please connect to the Claude API first');
        return;
    }

    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';

    try {
        const response = await fetch(CONFIG.API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': CONFIG.API_VERSION
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                max_tokens: 2000,
                messages: [{
                    role: 'user',
                    content: `Generate code for: ${prompt}. Provide HTML, CSS, and JavaScript code separately. Format the response as JSON with keys: html, css, js`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const generatedCode = JSON.parse(data.content);

        fileContents = {
            'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Generated Component</title>
    <style>${generatedCode.css}</style>
</head>
<body>
    <div id="app">
        ${generatedCode.html}
    </div>
    <script>${generatedCode.js}</script>
</body>
</html>`,
            'styles.css': generatedCode.css,
            'script.js': generatedCode.js
        };

        updateCodeDisplay(currentFile);
    } catch (error) {
        console.error('Code generation error:', error);
        alert('Failed to generate code. Please try again.');
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Code';
    }
}

// Display and Preview functions
function updateCodeDisplay(filename) {
    const content = fileContents[filename];
    const fileExtension = filename.split('.').pop();
    codeDisplay.className = `language-${fileExtension}`;
    codeDisplay.textContent = content;
    hljs.highlightElement(codeDisplay);
    currentFileSpan.textContent = filename;
    currentFile = filename;
    updatePreview();
}

function updatePreview() {
    const doc = previewFrame.contentDocument;
    doc.open();
    doc.write(fileContents['index.html']);
    doc.close();
}

// Event Listeners
connectButton.addEventListener('click', connectToApi);

generateButton.addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (prompt) {
        generateCode(prompt);
    }
});

fileList.addEventListener('click', (e) => {
    if (e.target.classList.contains('file')) {
        const filename = e.target.dataset.file;
        document.querySelectorAll('.file').forEach(f => f.classList.remove('active'));
        e.target.classList.add('active');
        updateCodeDisplay(filename);
    }
});

copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(fileContents[currentFile]);
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
        copyButton.textContent = 'Copy Code';
    }, 2000);
});

refreshButton.addEventListener('click', updatePreview);

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        generateButton.click();
    }
});

// Check for saved API key
const savedApiKey = localStorage.getItem('claude_api_key');
if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
    connectToApi();
}

// Initial load
updateCodeDisplay('index.html');

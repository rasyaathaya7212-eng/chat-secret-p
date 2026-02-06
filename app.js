// ---------------------------------------------------------
// HARDCODED SECURITY CREDENTIALS
// ---------------------------------------------------------
const REQUIRED_ROOM_ID = '5678';

const ALLOWED_USERS = [
    { username: 'rasya', key: '123' },
    { username: 'PENGGUNA1', key: '1234' }
];

// ---------------------------------------------------------
// GUN.JS INITIALIZATION
// ---------------------------------------------------------
// Using a public relay node. For production, deploy your own Gun peer.
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const sea = Gun.SEA;

// State
let currentUser = null;
let currentKey = null;
let currentRoom = null;
let chatNode = null;

// ---------------------------------------------------------
// DOM ELEMENTS
// ---------------------------------------------------------
const loginPhase = document.getElementById('login-phase');
const chatPhase = document.getElementById('chat-phase');
const loginForm = document.getElementById('login-form');
const chatForm = document.getElementById('chat-form');
const chatBox = document.getElementById('chat-box');
const verificationStatus = document.getElementById('verification-status');
const btnTerminate = document.getElementById('btn-terminate');

// ---------------------------------------------------------
// PHASE 1: LOGIN LOGIC
// ---------------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const room = document.getElementById('room').value.trim();
    const key = document.getElementById('key').value.trim();

    // 1. Check Mandatory Room ID
    if (room !== REQUIRED_ROOM_ID) {
        alert('ACCESS DENIED: RESTRICTED SECTOR ID. (INVALID ROOM)');
        return;
    }

    // 2. Validate Credentials against Hardcoded List
    const validUser = ALLOWED_USERS.find(u => u.username === username && u.key === key);

    if (!validUser) {
        alert('ACCESS DENIED: INVALID IDENTITY TAG OR DECRYPTION KEY.');
        return;
    }

    // 3. Success - Show Verification Animation
    verificationStatus.classList.remove('hidden');
    verificationStatus.innerHTML = `> AUTHENTICATING AS [${username}]<span class="blink">...</span>`;

    // Artificial delay for "Verification" animation effect
    setTimeout(() => {
        initializeChat(username, key, room);
    }, 2000); 
});

// ---------------------------------------------------------
// PHASE 2: CHAT INITIALIZATION
// ---------------------------------------------------------
function initializeChat(username, key, room) {
    currentUser = username;
    currentKey = key;
    currentRoom = room;

    // Switch UI
    loginPhase.classList.add('hidden');
    chatPhase.classList.remove('hidden');

    // Update Header Info
    document.getElementById('display-room').textContent = room;
    document.getElementById('display-user').textContent = username;

    // Set User Color in UI
    const statusDot = document.querySelector('.header-bar .status-dot');
    if (username === 'rasya') {
        statusDot.style.background = 'var(--color-rasya)';
        statusDot.style.boxShadow = '0 0 5px var(--color-rasya)';
    } else if (username === 'PENGGUNA1') {
        statusDot.style.background = 'var(--color-pengguna1)';
        statusDot.style.boxShadow = '0 0 5px var(--color-pengguna1)';
    }

    // Initialize Gun Node for this Room
    // We hash the room ID to create a "secret" path in the graph, though anyone with the room ID can find it.
    // The real security is the message payload encryption.
    chatNode = gun.get('military-terminal-chat').get(room);

    // Subscribe to updates
    chatNode.map().on(async (encryptedMsg, id) => {
        if (!encryptedMsg) return;
        
        // Decrypt the message
        try {
            const decrypted = await sea.decrypt(encryptedMsg, currentKey);
            if (decrypted) {
                renderMessage(decrypted, id);
            }
        } catch (err) {
            console.error('Decryption failed for message', id);
        }
    });
}

// ---------------------------------------------------------
// SEND MESSAGE LOGIC
// ---------------------------------------------------------
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    
    if (!text) return;

    // Create message object
    const messageData = {
        user: currentUser,
        text: text,
        timestamp: Date.now()
    };

    // Encrypt
    const encrypted = await sea.encrypt(messageData, currentKey);

    // Save to Gun (using timestamp as key to order roughly, though map() is unordered)
    chatNode.set(encrypted);

    input.value = '';
});

// ---------------------------------------------------------
// RENDER LOGIC
// ---------------------------------------------------------
const renderedMessages = new Set();

function renderMessage(msgData, id) {
    if (renderedMessages.has(id)) return;
    renderedMessages.add(id);

    const div = document.createElement('div');
    div.classList.add('msg-line');

    // Format Timestamp
    const date = new Date(msgData.timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour12: false });

    // Determine Color Class based on User
    let userClass = '';
    if (msgData.user === 'rasya') userClass = 'msg-rasya';
    else if (msgData.user === 'PENGGUNA1') userClass = 'msg-pengguna1';

    div.innerHTML = `
        <span class="timestamp">[${timeStr}]</span>
        <span class="${userClass}">[${msgData.user}]</span>: 
        <span class="msg-content">${escapeHtml(msgData.text)}</span>
    `;

    chatBox.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---------------------------------------------------------
// TERMINATE SESSION
// ---------------------------------------------------------
btnTerminate.addEventListener('click', () => {
    location.reload();
});

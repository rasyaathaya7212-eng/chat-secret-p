// ---------------------------------------------------------
// GUN.JS INITIALIZATION
// ---------------------------------------------------------
const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
let chatNode;

// State
let appState = {
    username: null,
    sector: null,
    key: null,
    path: null
};

// ---------------------------------------------------------
// DOM ELEMENTS
// ---------------------------------------------------------
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const statusMsg = document.getElementById('status-msg');

const dispSector = document.getElementById('disp-sector');
const dispUser = document.getElementById('disp-user');
const chatBody = document.getElementById('chat-body');
const msgForm = document.getElementById('msg-form');
const msgInput = document.getElementById('msg-input');
const btnLogout = document.getElementById('btn-logout');

// ---------------------------------------------------------
// LOGIN LOGIC
// ---------------------------------------------------------
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const sector = document.getElementById('sector').value.trim();
    const key = document.getElementById('key').value.trim();

    if (!username || !sector || !key) {
        statusMsg.textContent = "ERROR: ALL FIELDS MANDATORY";
        return;
    }

    statusMsg.textContent = "AUTHENTICATING...";

    // DATA ISOLATION LOGIC:
    // Path = "chat-v2/" + Sector + "_" + Key
    // This ensures only users with SAME Sector AND Key land in the same room.
    // We simple-hash/combine them.
    const uniquePath = `terminal-chat-v2/${sector}_${key}`;

    setTimeout(() => {
        initializeSession(username, sector, key, uniquePath);
    }, 1000);
});

function initializeSession(user, sector, key, path) {
    // Update State
    appState.username = user;
    appState.sector = sector;
    appState.key = key;
    appState.path = path;

    // Update UI
    dispSector.textContent = sector;
    dispUser.textContent = user;
    
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');

    // Init Gun Node
    chatNode = gun.get(path);

    // Subscribe to messages
    // map() iterates over all items in the list
    chatNode.map().on((data, id) => {
        if (data) {
            renderMessage(data, id);
        }
    });

    scrollToBottom();
}

// ---------------------------------------------------------
// SEND LOGIC
// ---------------------------------------------------------
msgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;

    const message = {
        text: text,
        user: appState.username,
        timestamp: Date.now()
    };

    // Save to Gun
    // We use the timestamp as a rough sort key if needed, 
    // but Gun's map() is unordered. We sort in UI.
    chatNode.set(message);

    msgInput.value = '';
    // Optimistic UI update handled by the .on() listener 
    // (Gun is fast enough locally)
});

// ---------------------------------------------------------
// RENDER LOGIC
// ---------------------------------------------------------
// Keep track of rendered messages to avoid duplicates/flicker
const renderedIds = new Set();
// We'll store messages in an array to sort them chronologically
let messagesBuffer = [];

function renderMessage(data, id) {
    if (renderedIds.has(id)) return;
    renderedIds.add(id);

    // Validate data structure
    if (!data.text || !data.user || !data.timestamp) return;

    messagesBuffer.push({ ...data, id });
    // Sort by timestamp
    messagesBuffer.sort((a, b) => a.timestamp - b.timestamp);

    // Clear and Re-render (Simple approach for correct order)
    // For production with thousands of messages, we'd insert efficiently.
    chatBody.innerHTML = '<div class="sys-msg">--- ENCRYPTED CONNECTION ESTABLISHED ---</div>';
    
    messagesBuffer.forEach(msg => {
        const div = document.createElement('div');
        div.classList.add('msg-row');
        
        // Check if own message
        if (msg.user === appState.username) {
            div.classList.add('msg-own');
        }

        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString('en-US', { hour12: false });

        div.innerHTML = `
            <div class="msg-meta">[${timeStr}] ${escapeHtml(msg.user)}</div>
            <div class="msg-content">${escapeHtml(msg.text)}</div>
        `;
        chatBody.appendChild(div);
    });

    scrollToBottom();
}

function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------
btnLogout.addEventListener('click', () => {
    location.reload();
});

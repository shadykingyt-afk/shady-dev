// ==========================================
// CONFIGURATION
// ==========================================
const YT_CHANNEL = "https://www.youtube.com/@MrCansl";
const DISCORD_SERVER = "https://discord.gg/t54xxU9tfs";

// رابط الـ Cloudflare Worker الخاص بك (بديل GitHub)
const WORKER_URL = "https://billowing-band-5fe3.shadykingyt.workers.dev";

// Encrypted Salt & Key Generation Algorithm
const _0x9b2a = [0x53, 0x48, 0x41, 0x44, 0x59, 0x32, 0x30, 0x32, 0x36, 0x5f, 0x53, 0x45, 0x53, 0x55, 0x52, 0x45];
const _0xgetSalt = () => String.fromCharCode(..._0x9b2a);

let pendingUserData = null;
let cachedWhitelistData = null;

// Modal & Navigation Controls
function handleBuyRequest(scriptName, price) {
    window.open(DISCORD_SERVER, '_blank');
    const titleEl = document.getElementById("buyModalTitle");
    if (titleEl) titleEl.innerText = `Buy ${scriptName} (${price})`;
    const modal = document.getElementById("discordModal");
    if (modal) modal.classList.add("active");
}

function closeDiscordModal() {
    const modal = document.getElementById("discordModal");
    if (modal) modal.classList.remove("active");
}

function switchTab(tabId, evt) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
}

// Local Storage Helpers
function getUsersDB() { return JSON.parse(localStorage.getItem("shady_users_db") || "{}"); }
function saveUsersDB(db) { localStorage.setItem("shady_users_db", JSON.stringify(db)); }
function getCurrentUser() { return localStorage.getItem("shady_active_user"); }

function setCurrentUser(username) {
    if (username) {
        localStorage.setItem("shady_active_user", username);
    } else {
        localStorage.removeItem("shady_active_user");
    }
    renderAuthUI();
    fetchAndRenderScripts();
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const icon = isError 
        ? `<i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 16px;"></i>` 
        : `<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 16px;"></i>`;
    
    toast.style.borderColor = isError ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)";
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3500);
}

function openAuthModal(mode = 'login') {
    switchAuthMode(mode);
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.add("active");
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.remove("active");
    backToStep1();
}

function switchAuthMode(mode) {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const loginTabBtn = document.getElementById("loginTabBtn");
    const signupTabBtn = document.getElementById("signupTabBtn");

    if (mode === 'login') {
        if (loginForm) loginForm.style.display = "block";
        if (signupForm) signupForm.style.display = "none";
        if (loginTabBtn) loginTabBtn.classList.add("active");
        if (signupTabBtn) signupTabBtn.classList.remove("active");
    } else {
        if (loginForm) loginForm.style.display = "none";
        if (signupForm) signupForm.style.display = "block";
        if (signupTabBtn) signupTabBtn.classList.add("active");
        if (loginTabBtn) loginTabBtn.classList.remove("active");
    }
}

function backToStep1() {
    const s1 = document.getElementById("signupStep1");
    const s2 = document.getElementById("signupStep2");
    if (s1) s1.style.display = "block";
    if (s2) s2.style.display = "none";
    pendingUserData = null;
}

// 1. Roblox Authentication Step 1 & 2
async function handleSignUpStep1(e) {
    e.preventDefault();
    const usernameInput = document.getElementById("signupUser");
    const passInput = document.getElementById("signupPass");
    const passConfirmInput = document.getElementById("signupPassConfirm");

    if (!usernameInput || !passInput) return;

    const username = usernameInput.value.trim();
    const pass = passInput.value;
    const passConfirm = passConfirmInput ? passConfirmInput.value : "";

    if (username.length < 3) { showToast("Username must be at least 3 characters!", true); return; }
    if (pass.length < 4) { showToast("Password must be at least 4 characters!", true); return; }
    if (pass !== passConfirm) { showToast("Passwords do not match!", true); return; }

    const db = getUsersDB();
    if (db[username.toLowerCase()]) {
        showToast("This Roblox username is already registered!", true);
        return;
    }

    const checkBtn = document.getElementById("btnCheckRoblox");
    if (checkBtn) {
        checkBtn.disabled = true;
        checkBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking Roblox API...`;
    }

    try {
        const searchRes = await fetch(`https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
        if (!searchRes.ok) throw new Error("API Network error");

        const searchData = await searchRes.json();
        const exactMatch = searchData.data ? searchData.data.find(u => u.name.toLowerCase() === username.toLowerCase()) : null;

        if (!exactMatch) {
            showToast("Roblox account not found! Check spelling.", true);
            if (checkBtn) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = `<i class="fa-brands fa-roblox"></i> Check & Verify Roblox Account`;
            }
            return;
        }

        const userId = exactMatch.id;
        const displayName = exactMatch.displayName || exactMatch.name;
        const randomCode = Math.floor(100000 + Math.random() * 900000);
        const verifyCode = `shady-${randomCode}`;

        pendingUserData = {
            username: exactMatch.name,
            userId: userId,
            password: pass,
            verifyCode: verifyCode
        };

        const avatarUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`;

        const badgeContainer = document.getElementById("robloxBadgeContainer");
        if (badgeContainer) {
            badgeContainer.innerHTML = '';
            const badge = document.createElement("div");
            badge.className = "roblox-badge";
            
            const img = document.createElement("img");
            img.src = avatarUrl;
            img.alt = "Avatar";
            img.onerror = () => { img.src = 'https://via.placeholder.com/48/8b5cf6/ffffff?text=RBX'; };

            const info = document.createElement("div");
            info.className = "roblox-info";
            
            const h4 = document.createElement("h4");
            h4.textContent = `${displayName} (@${exactMatch.name})`;
            
            const p = document.createElement("p");
            p.innerHTML = `Roblox ID: ${userId} • <span style="color:#10b981;">Account Found</span>`;

            info.appendChild(h4);
            info.appendChild(p);
            badge.appendChild(img);
            badge.appendChild(info);
            badgeContainer.appendChild(badge);
        }

        const bioCodeEl = document.getElementById("generatedBioCode");
        if (bioCodeEl) bioCodeEl.innerText = verifyCode;

        const s1 = document.getElementById("signupStep1");
        const s2 = document.getElementById("signupStep2");
        if (s1) s1.style.display = "none";
        if (s2) s2.style.display = "block";

    } catch (err) {
        console.error(err);
        showToast("Failed to connect to Roblox API.", true);
    } finally {
        if (checkBtn) {
            checkBtn.disabled = false;
            checkBtn.innerHTML = `<i class="fa-brands fa-roblox"></i> Check & Verify Roblox Account`;
        }
    }
}

async function verifyRobloxBio() {
    if (!pendingUserData) return;

    const verifyBtn = document.getElementById("btnVerifyBio");
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Checking Bio...`;
    }

    try {
        const res = await fetch(`https://users.roproxy.com/v1/users/${pendingUserData.userId}`);
        if (!res.ok) throw new Error("Profile API error");

        const profileData = await res.json();
        const userBio = profileData.description || "";

        if (userBio.includes(pendingUserData.verifyCode)) {
            const db = getUsersDB();
            db[pendingUserData.username.toLowerCase()] = {
                username: pendingUserData.username,
                password: pendingUserData.password,
                userId: pendingUserData.userId,
                verifiedAt: new Date().toISOString()
            };
            saveUsersDB(db);

            setCurrentUser(pendingUserData.username);
            closeAuthModal();
            showToast("Roblox Bio Verified! Account Created 🎉");
        } else {
            showToast("Code not found in Bio! Paste it and try again.", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Error reading profile Bio.", true);
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `<i class="fa-solid fa-shield-check"></i> Verify Bio & Create Account`;
        }
    }
}

function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById("loginUser");
    const passInput = document.getElementById("loginPass");

    if (!usernameInput || !passInput) return;

    const username = usernameInput.value.trim();
    const pass = passInput.value;

    const db = getUsersDB();
    const userObj = db[username.toLowerCase()];

    if (!userObj || userObj.password !== pass) {
        showToast("Invalid username or password!", true);
        return;
    }

    setCurrentUser(userObj.username);
    closeAuthModal();
    showToast("Signed in successfully!");
}

function handleLogout() {
    setCurrentUser(null);
    showToast("Logged out.");
}

// 2. Cloudflare Worker Whitelist Verification
async function fetchAndRenderScripts() {
    const currentUser = getCurrentUser();
    const cleanUser = currentUser ? currentUser.toLowerCase() : null;

    try {
        const response = await fetch(`${WORKER_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
            cachedWhitelistData = await response.json();
        }
    } catch (e) {
        console.warn("Could not fetch Whitelist from Cloudflare Worker, using fallback logic.", e);
    }

    const data = cachedWhitelistData || { owners: ["sh4dizz", "mrcansl"], purchases: {}, scripts: {} };
    
    // Check if current logged-in user is in owners array
    const ownersList = data.owners ? data.owners.map(o => o.toLowerCase()) : ["sh4dizz", "mrcansl"];
    const isOwner = cleanUser && ownersList.includes(cleanUser);

    const userPurchased = (data.purchases && cleanUser && data.purchases[cleanUser]) ? data.purchases[cleanUser] : [];

    document.querySelectorAll(".mac-card[data-script-id]").forEach(card => {
        const scriptId = card.getAttribute("data-script-id");
        const actionZone = card.querySelector(".action-btn-zone");
        if (!actionZone) return;

        if (!currentUser) {
            actionZone.innerHTML = `
                <button class="btn-gradient btn-discord" onclick="openAuthModal('login')">
                    <i class="fa-solid fa-lock"></i> Sign In to Access
                </button>
            `;
        } else if (isOwner) {
            const scriptData = data.scripts ? data.scripts[scriptId] : null;
            const payload = scriptData ? scriptData.payload : 'print("Script Payload Error")';

            actionZone.innerHTML = `
                <button class="btn-gradient btn-unlocked" onclick="copyScriptText('${btoa(unescape(encodeURIComponent(payload)))}', 'Script', true)">
                    <i class="fa-solid fa-crown"></i> Copy (Owner Access)
                </button>
            `;
        } else if (userPurchased.includes(scriptId)) {
            const scriptData = data.scripts ? data.scripts[scriptId] : null;
            const payload = scriptData ? scriptData.payload : 'print("Script Payload Error")';

            actionZone.innerHTML = `
                <button class="btn-gradient btn-unlocked" onclick="copyScriptText('${btoa(unescape(encodeURIComponent(payload)))}', 'Script', true)">
                    <i class="fa-regular fa-copy"></i> Copy Script
                </button>
            `;
        } else {
            actionZone.innerHTML = `
                <button class="btn-gradient btn-discord" onclick="handleBuyRequest('${scriptId}', 'Paid')">
                    <i class="fa-brands fa-discord"></i> Buy via Discord
                </button>
            `;
        }
    });
}

// 3. Render Header Profile & Unique ID
function renderAuthUI() {
    const currentUser = getCurrentUser();
    const authNavContainer = document.getElementById("authNavContainer");
    const keyContentContainer = document.getElementById("keyContentContainer");
    const keyBoxDesc = document.getElementById("keyBoxDesc");

    if (!authNavContainer) return;

    if (currentUser) {
        const db = getUsersDB();
        const userObj = db[currentUser.toLowerCase()];
        const cleanUser = currentUser.toLowerCase();
        
        const avatarImg = userObj && userObj.userId 
            ? `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userObj.userId}&size=150x150&format=Png&isCircular=true`
            : '';

        const rbxId = userObj && userObj.userId ? userObj.userId : 'N/A';

        authNavContainer.innerHTML = `
            <div class="user-profile-badge" onclick="copyUserID('${currentUser}', '${rbxId}')" style="cursor:pointer;" title="Click to copy your ID">
                <div class="user-avatar">
                    ${avatarImg ? `<img src="${avatarImg}" onerror="this.parentNode.innerText='${currentUser.charAt(0).toUpperCase()}';">` : currentUser.charAt(0).toUpperCase()}
                </div>
                <div>
                    <span style="font-size: 13px; font-weight:600; color:#fff;">${currentUser}</span>
                    <span class="user-id-sub">ID: ${rbxId} <i class="fa-regular fa-copy"></i></span>
                </div>
            </div>
            <button class="btn-auth-nav" onclick="handleLogout()">
                <i class="fa-solid fa-right-from-bracket"></i> Logout
            </button>
        `;

        if (keyBoxDesc) keyBoxDesc.innerText = `Logged in as ${currentUser}. Click below to unlock your key.`;

        if (keyContentContainer) {
            const expireTime = localStorage.getItem(`shady_key_expire_${cleanUser}`);
            if (expireTime && Date.now() < parseInt(expireTime, 10)) {
                const userKey = generateUserKey(currentUser);
                keyContentContainer.innerHTML = `
                    <div class="key-display" id="keyDisplay">${userKey}</div>
                    <div id="actionContainer">
                        <button class="btn-gradient" onclick="copyKey('${userKey}')">
                            <i class="fa-regular fa-copy"></i> Copy My Unique Key
                        </button>
                        <div class="timer-badge" style="margin-top: 15px;">
                            <i class="fa-regular fa-clock"></i> Key Expires In: <span id="keyTimer" style="color:#fff; font-weight:600;">12h 00m 00s</span>
                        </div>
                    </div>
                `;
                updateTimer();
            } else {
                keyContentContainer.innerHTML = `
                    <div class="key-display locked" id="keyDisplay">••••••••</div>
                    <div id="actionContainer">
                        <button class="btn-gradient" onclick="startUnlockProcess('${currentUser}')">
                            <i class="fa-brands fa-youtube"></i> Subscribe & Unlock Key
                        </button>
                    </div>
                `;
            }
        }
    } else {
        authNavContainer.innerHTML = `
            <button class="btn-auth-nav" onclick="openAuthModal('login')">
                <i class="fa-solid fa-right-to-bracket"></i> Sign In
            </button>
            <button class="btn-auth-nav primary" onclick="openAuthModal('signup')">
                <i class="fa-solid fa-user-plus"></i> Sign Up
            </button>
        `;

        if (keyBoxDesc) keyBoxDesc.innerText = "You must be signed in with a verified Roblox account.";
        if (keyContentContainer) {
            keyContentContainer.innerHTML = `
                <div class="key-display locked">••••••••</div>
                <button class="btn-gradient" onclick="openAuthModal('login')">
                    <i class="fa-solid fa-lock"></i> Sign In to Access Key
                </button>
            `;
        }
    }
}

// Key Generator Helpers
function getCurrentPeriod() { return Math.floor(Date.now() / 1000 / 43200); }

function generateUserKey(username) {
    const cleanUser = username.trim().toLowerCase();
    const db = getUsersDB();
    const userObj = db[cleanUser];
    
    let counterVal = 1;
    if (userObj && userObj.userId) {
        counterVal = parseInt(String(userObj.userId).slice(-5), 10) || 1;
    }
    const formattedCounter = String(counterVal).padStart(5, '0');

    const period = getCurrentPeriod();
    const raw = `${cleanUser}:${period}:${_0xgetSalt()}`;
    
    let hash = 0x811c9dc5;
    for (let i = 0; i < raw.length; i++) {
        hash ^= raw.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    hash = hash >>> 0;

    const getChar = (shift) => String.fromCharCode(65 + ((hash >> shift) % 26));
    const getDigit = (shift) => ((hash >> shift) % 10).toString();

    const group1 = `${getChar(0)}${getDigit(4)}${getChar(8)}${getDigit(12)}`;
    const group2 = `${getChar(16)}${getDigit(20)}${getChar(24)}${getDigit(2)}`;
    const group3 = `${getChar(6)}${getDigit(10)}${getChar(14)}${getDigit(18)}`;

    return `${group1}-${group2}-${group3}-${formattedCounter}`;
}

let countdownInterval = null;

function startUnlockProcess(username) {
    window.open(YT_CHANNEL, '_blank');

    const actionContainer = document.getElementById("actionContainer");
    let timeLeft = 10;

    if (actionContainer) {
        actionContainer.innerHTML = `
            <button class="btn-gradient" style="opacity:0.75; cursor:not-allowed;" disabled id="countingBtn">
                <i class="fa-solid fa-spinner fa-spin"></i> Verifying... (${timeLeft}s)
            </button>
        `;
    }

    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timeLeft--;
        const countingBtn = document.getElementById("countingBtn");
        if (countingBtn) {
            countingBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying... (${timeLeft}s)`;
        }

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            revealKey(username);
        }
    }, 1000);
}

function revealKey(username) {
    const cleanUser = username.toLowerCase();
    const expireTime = Date.now() + (12 * 60 * 60 * 1000);
    localStorage.setItem(`shady_key_expire_${cleanUser}`, expireTime.toString());

    const userKey = generateUserKey(username);
    const keyDisplay = document.getElementById("keyDisplay");
    const actionContainer = document.getElementById("actionContainer");

    if (keyDisplay) {
        keyDisplay.classList.remove("locked");
        keyDisplay.innerText = userKey;
    }

    if (actionContainer) {
        actionContainer.innerHTML = `
            <button class="btn-gradient" onclick="copyKey('${userKey}')">
                <i class="fa-regular fa-copy"></i> Copy My Unique Key
            </button>
            <div class="timer-badge" style="margin-top: 15px;">
                <i class="fa-regular fa-clock"></i> Key Expires In: <span id="keyTimer" style="color:#fff; font-weight:600;">12h 00m 00s</span>
            </div>
        `;
    }
    updateTimer();
    showToast("Key Unlocked Successfully!");
}

function updateTimer() {
    const timerEl = document.getElementById("keyTimer");
    if (!timerEl) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const expireTime = localStorage.getItem(`shady_key_expire_${currentUser.toLowerCase()}`);
    if (!expireTime) return;

    const remainingMs = parseInt(expireTime, 10) - Date.now();

    if (remainingMs <= 0) {
        timerEl.innerText = "00h 00m 00s (Expired)";
        return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    timerEl.innerText = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function copyUserID(username, rbxId) {
    navigator.clipboard.writeText(`${username} (Roblox ID: ${rbxId})`).then(() => {
        showToast("Username & Roblox ID Copied to Clipboard!");
    });
}

function copyKey(keyText) {
    navigator.clipboard.writeText(keyText).then(() => {
        showToast("Key copied to clipboard!");
    });
}

function copyScriptText(code, name, isEncoded = false) {
    const finalCode = isEncoded ? decodeURIComponent(escape(atob(code))) : code;
    navigator.clipboard.writeText(finalCode).then(() => {
        showToast(`${name} copied!`);
    });
}

// Initial Setup Event Listener
document.addEventListener("DOMContentLoaded", () => {
    setInterval(updateTimer, 1000);
    renderAuthUI();
    fetchAndRenderScripts();
});
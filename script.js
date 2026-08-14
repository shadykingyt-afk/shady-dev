// ==========================================
// CONFIGURATION
// ==========================================
const YT_CHANNEL = "https://www.youtube.com/@MrCansl";
const DISCORD_SERVER = "https://discord.gg/t54xxU9tfs";
const WORKER_URL = "https://billowing-band-5fe3.shadykingyt.workers.dev";

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
        localStorage.setItem("shady_active_user", username.toLowerCase().trim());
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
    const cleanUser = username.toLowerCase();
    const pass = passInput.value;
    const passConfirm = passConfirmInput ? passConfirmInput.value : "";

    if (username.length < 3) { showToast("Username must be at least 3 characters!", true); return; }
    if (pass.length < 4) { showToast("Password must be at least 4 characters!", true); return; }
    if (pass !== passConfirm) { showToast("Passwords do not match!", true); return; }

    if (cachedWhitelistData && cachedWhitelistData.users && cachedWhitelistData.users[cleanUser]) {
        showToast("This Roblox username is already registered on the server!", true);
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
        const exactMatch = searchData.data ? searchData.data.find(u => u.name.toLowerCase() === cleanUser) : null;

        if (!exactMatch) {
            showToast("Roblox account not found! Check spelling.", true);
            return;
        }

        const userId = exactMatch.id;
        const displayName = exactMatch.displayName || exactMatch.name;
        const verifyCode = `shady-${Math.floor(100000 + Math.random() * 900000)}`;

        pendingUserData = {
            username: exactMatch.name.toLowerCase(),
            userId: userId,
            password: pass,
            verifyCode: verifyCode
        };

        const badgeContainer = document.getElementById("robloxBadgeContainer");
        if (badgeContainer) {
            badgeContainer.innerHTML = `
                <div class="roblox-badge">
                    <img src="https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true" onerror="this.src='https://via.placeholder.com/48/8b5cf6/ffffff?text=RBX';">
                    <div class="roblox-info">
                        <h4>${displayName} (@${exactMatch.name})</h4>
                        <p>Roblox ID: ${userId} • <span style="color:#10b981;">Account Found</span></p>
                    </div>
                </div>
            `;
        }

        const bioCodeEl = document.getElementById("generatedBioCode");
        if (bioCodeEl) bioCodeEl.innerText = verifyCode;

        const s1 = document.getElementById("signupStep1");
        const s2 = document.getElementById("signupStep2");
        if (s1) s1.style.display = "none";
        if (s2) s2.style.display = "block";

    } catch (err) {
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
        if (!(profileData.description || "").includes(pendingUserData.verifyCode)) {
            showToast("Code not found in Bio! Paste it and try again.", true);
            return;
        }

        verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving to Server...`;

        const serverRes = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'signup',
                username: pendingUserData.username,
                password: pendingUserData.password,
                userId: pendingUserData.userId
            })
        });

        const serverData = await serverRes.json();
        if (!serverData.success) {
            showToast(serverData.error || "Server registration failed!", true);
            return;
        }

        const db = getUsersDB();
        db[pendingUserData.username] = {
            username: pendingUserData.username,
            userId: pendingUserData.userId
        };
        saveUsersDB(db);

        setCurrentUser(pendingUserData.username);
        closeAuthModal();
        showToast("Roblox Bio Verified! Account Created 🎉");

    } catch (err) {
        showToast("Error during verification or server registration.", true);
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `<i class="fa-solid fa-shield-check"></i> Verify Bio & Create Account`;
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById("loginUser");
    const passInput = document.getElementById("loginPass");

    if (!usernameInput || !passInput) return;

    const username = usernameInput.value.trim().toLowerCase();
    const pass = passInput.value;

    const submitBtn = document.querySelector("#loginForm button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing In...`;
    }

    try {
        const res = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: pass
            })
        });

        const data = await res.json();
        if (!data.success) {
            showToast(data.error || "Invalid username or password!", true);
            return;
        }

        const db = getUsersDB();
        db[username] = {
            username: username,
            userId: data.userId || null
        };
        saveUsersDB(db);

        setCurrentUser(username);
        closeAuthModal();
        showToast("Signed in successfully!");

    } catch (err) {
        showToast("Failed to connect to login server.", true);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Sign In`;
        }
    }
}

function handleLogout() {
    setCurrentUser(null);
    showToast("Logged out.");
}

// 2. Fetch Whitelist & Render Access
async function fetchAndRenderScripts() {
    const currentUser = getCurrentUser();
    const cleanUser = currentUser ? currentUser.toLowerCase() : null;

    try {
        const response = await fetch(`${WORKER_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
            cachedWhitelistData = await response.json();
        }
    } catch (e) {
        console.warn("Could not fetch Whitelist from Cloudflare Worker.", e);
    }

    const data = cachedWhitelistData || { owners: ["sh4dizz", "mrcansl"], purchases: {}, scripts: {} };
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
            const payload = data.scripts && data.scripts[scriptId] ? data.scripts[scriptId].payload : 'print("Script Error")';
            actionZone.innerHTML = `
                <button class="btn-gradient btn-unlocked" onclick="copyScriptText('${btoa(unescape(encodeURIComponent(payload)))}', 'Script', true)">
                    <i class="fa-solid fa-crown"></i> Copy (Owner Access)
                </button>
            `;
        } else if (userPurchased.includes(scriptId)) {
            const payload = data.scripts && data.scripts[scriptId] ? data.scripts[scriptId].payload : 'print("Script Error")';
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

// 3. Render Header Profile
function renderAuthUI() {
    const currentUser = getCurrentUser();
    const authNavContainer = document.getElementById("authNavContainer");
    const keyContentContainer = document.getElementById("keyContentContainer");
    const keyBoxDesc = document.getElementById("keyBoxDesc");

    if (!authNavContainer) return;

    if (currentUser) {
        const db = getUsersDB();
        const cleanUser = currentUser.toLowerCase();
        const userObj = db[cleanUser];
        
        const rbxId = userObj && userObj.userId ? userObj.userId : 'N/A';
        const avatarImg = userObj && userObj.userId 
            ? `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userObj.userId}&size=150x150&format=Png&isCircular=true` 
            : '';

        authNavContainer.innerHTML = `
            <div class="user-profile-badge" onclick="copyUserID('${currentUser}', '${rbxId}')" style="cursor:pointer;" title="Click to copy ID">
                <div class="user-avatar">${avatarImg ? `<img src="${avatarImg}">` : currentUser.charAt(0).toUpperCase()}</div>
                <div>
                    <span style="font-size: 13px; font-weight:600; color:#fff;">${currentUser}</span>
                    <span class="user-id-sub">ID: ${rbxId} <i class="fa-regular fa-copy"></i></span>
                </div>
            </div>
            <button class="btn-auth-nav" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        `;

        if (keyBoxDesc) keyBoxDesc.innerText = `Logged in as ${currentUser}. Click below to unlock your key.`;

        if (keyContentContainer) {
            const savedKey = localStorage.getItem(`shady_active_key_${cleanUser}`);
            const expireTime = localStorage.getItem(`shady_key_expire_${cleanUser}`);

            if (savedKey && expireTime && Date.now() < parseInt(expireTime, 10)) {
                keyContentContainer.innerHTML = `
                    <div class="key-display" id="keyDisplay">${savedKey}</div>
                    <div id="actionContainer">
                        <button class="btn-gradient" onclick="copyKey('${savedKey}')"><i class="fa-regular fa-copy"></i> Copy My Unique Key</button>
                        <div class="timer-badge" style="margin-top: 15px;"><i class="fa-regular fa-clock"></i> Key Expires In: <span id="keyTimer">12h 00m 00s</span></div>
                    </div>
                `;
                updateTimer();
            } else {
                keyContentContainer.innerHTML = `
                    <div class="key-display locked" id="keyDisplay">••••••••</div>
                    <div id="actionContainer">
                        <button class="btn-gradient" onclick="startUnlockProcess('${currentUser}')"><i class="fa-brands fa-youtube"></i> Subscribe & Unlock Key</button>
                    </div>
                `;
            }
        }
    } else {
        authNavContainer.innerHTML = `
            <button class="btn-auth-nav" onclick="openAuthModal('login')"><i class="fa-solid fa-right-to-bracket"></i> Sign In</button>
            <button class="btn-auth-nav primary" onclick="openAuthModal('signup')"><i class="fa-solid fa-user-plus"></i> Sign Up</button>
        `;
        if (keyBoxDesc) keyBoxDesc.innerText = "You must be signed in with a verified Roblox account.";
        if (keyContentContainer) {
            keyContentContainer.innerHTML = `
                <div class="key-display locked">••••••••</div>
                <button class="btn-gradient" onclick="openAuthModal('login')"><i class="fa-solid fa-lock"></i> Sign In to Access Key</button>
            `;
        }
    }
}

// 4. Secure Key Request from Server
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
        if (countingBtn) countingBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying... (${timeLeft}s)`;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            fetchKeyFromServer(username);
        }
    }, 1000);
}

async function fetchKeyFromServer(username) {
    const cleanUser = username.toLowerCase();
    try {
        const res = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate_key', username: cleanUser })
        });
        const data = await res.json();

        if (!data.success || !data.key) {
            showToast("Failed to fetch key from secure server!", true);
            renderAuthUI();
            return;
        }

        const expireTime = Date.now() + (12 * 60 * 60 * 1000);
        localStorage.setItem(`shady_key_expire_${cleanUser}`, expireTime.toString());
        localStorage.setItem(`shady_active_key_${cleanUser}`, data.key);

        renderAuthUI();
        showToast("Key Unlocked Successfully from Server!");

    } catch (e) {
        showToast("Error communicating with security server.", true);
        renderAuthUI();
    }
}

function updateTimer() {
    const timerEl = document.getElementById("keyTimer");
    const currentUser = getCurrentUser();
    if (!timerEl || !currentUser) return;

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
    navigator.clipboard.writeText(`${username} (Roblox ID: ${rbxId})`).then(() => showToast("Username & Roblox ID Copied!"));
}

function copyKey(keyText) {
    navigator.clipboard.writeText(keyText).then(() => showToast("Key copied to clipboard!"));
}

function copyScriptText(code, name, isEncoded = false) {
    const finalCode = isEncoded ? decodeURIComponent(escape(atob(code))) : code;
    navigator.clipboard.writeText(finalCode).then(() => showToast(`${name} copied!`));
}

document.addEventListener("DOMContentLoaded", () => {
    setInterval(updateTimer, 1000);
    renderAuthUI();
    fetchAndRenderScripts();
});

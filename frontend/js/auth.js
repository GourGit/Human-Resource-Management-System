
const KEYS = {
    USERS: 'hrms_users',
    SESSION: 'hrms_session',
    REMEMBER: 'hrms_remember',
    LOGIN_FAILS: 'hrms_login_fails',
    LOCKOUT_AT: 'hrms_lockout_at',
};

// Robust storage wrapper to handle local file:/// isolation
const Storage = {
    // Read state from window.name and local storage
    getState() {
        let state = {};
        try {
            if (window.name && window.name.trim().startsWith('{')) {
                state = JSON.parse(window.name);
            }
        } catch (e) {
            console.warn("Failed to parse window.name storage:", e);
        }

        // Merge with localStorage/sessionStorage if available
        try {
            for (const key of Object.values(KEYS)) {
                if (!state[key]) {
                    const localVal = localStorage.getItem(key);
                    if (localVal) state[key] = localVal;
                }
                if (!state[key]) {
                    const sessionVal = sessionStorage.getItem(key);
                    if (sessionVal) state[key] = sessionVal;
                }
            }
        } catch (e) {
            console.warn("localStorage/sessionStorage access restricted:", e);
        }
        return state;
    },

    // Save state to window.name and local storage
    saveState(state) {
        try {
            window.name = JSON.stringify(state);
        } catch (e) {
            console.warn("Failed to write to window.name:", e);
        }
    },

    getItem(key) {
        // First try state from window.name (robust for file://)
        const state = this.getState();
        if (state[key]) return state[key];

        // Fallback to local storage direct access
        try {
            return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
        } catch (e) {
            return null;
        }
    },

    setItem(key, value, useSession = false) {
        const state = this.getState();
        state[key] = value;
        this.saveState(state);

        try {
            if (useSession) {
                sessionStorage.setItem(key, value);
            } else {
                localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn(`Failed to set item in storage for key ${key}:`, e);
        }
    },

    removeItem(key) {
        const state = this.getState();
        delete state[key];
        this.saveState(state);

        try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn(`Failed to remove item from storage for key ${key}:`, e);
        }
    }
};

const MAX_ATTEMPTS = 3;        // failed attempts before lockout
const LOCKOUT_MS = 30_000;   // 30-second lockout

// ── SHA-256 Password Hashing (Web Crypto API) ────────────────
/**
 * Returns a hex SHA-256 digest of the given string.
 * @param {string} plain
 * @returns {Promise<string>}
 */
async function hashPassword(plain) {
    const encoded = new TextEncoder().encode(plain);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ── User Store Helpers ───────────────────────────────────────
/** @returns {Array} All registered users */
function getUsers() {
    return JSON.parse(Storage.getItem(KEYS.USERS) || '[]');
}

/** @param {Array} users */
function saveUsers(users) {
    Storage.setItem(KEYS.USERS, JSON.stringify(users));
}

/** Find a user by email (case-insensitive) */
function findUserByEmail(email) {
    return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/** Find a user by employee ID */
function findUserByEmpId(empId) {
    return getUsers().find(u => u.employeeId === empId) || null;
}

/**
 * Register a new user.
 * Password is hashed before saving.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
async function registerUser({ name, employeeId, email, phone, role, password }) {
    const users = getUsers();

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, message: 'An account with this email already exists.' };
    }

    if (users.some(u => u.employeeId === employeeId)) {
        return { ok: false, message: 'This Employee ID is already registered.' };
    }

    const passwordHash = await hashPassword(password);

    users.push({
        name,
        employeeId,
        email: email.toLowerCase(),
        phone,
        role,
        passwordHash,
        createdAt: new Date().toISOString(),
    });

    saveUsers(users);
    return { ok: true, message: 'Account created successfully!' };
}

/**
 * Verify email + plaintext password.
 * @returns {Promise<{ok: boolean, user?: object, message: string}>}
 */
async function verifyLogin(email, password) {
    const user = findUserByEmail(email);
    if (!user) return { ok: false, message: 'No account found with this email.' };

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) {
        return { ok: false, message: 'Incorrect password. Please try again.' };
    }

    return { ok: true, user, message: 'Login successful.' };
}

// ── Session Management ───────────────────────────────────────
/**
 * Persist an active session.
 * If `remember` is true the session survives browser restarts (localStorage),
 * otherwise it lives only for the tab (sessionStorage).
 * @param {object} user
 * @param {boolean} remember
 */
function createSession(user, remember = false) {
    const session = {
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId,
        loginAt: new Date().toISOString(),
    };

    if (remember) {
        Storage.setItem(KEYS.SESSION, JSON.stringify(session), false);
        Storage.setItem(KEYS.REMEMBER, '1', false);
    } else {
        Storage.setItem(KEYS.SESSION, JSON.stringify(session), true);
        Storage.removeItem(KEYS.REMEMBER);
    }
}

/** Returns the current session object, or null if not logged in. */
function getSession() {
    const raw = Storage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
}

/** Clear the active session (logout). */
function destroySession() {
    Storage.removeItem(KEYS.SESSION);
    Storage.removeItem(KEYS.REMEMBER);
}

// ── Brute-Force / Rate Limiting ──────────────────────────────
function getFailedAttempts() {
    return parseInt(Storage.getItem(KEYS.LOGIN_FAILS) || '0', 10);
}

function incrementFailedAttempts() {
    const count = getFailedAttempts() + 1;
    Storage.setItem(KEYS.LOGIN_FAILS, String(count));
    if (count >= MAX_ATTEMPTS) {
        Storage.setItem(KEYS.LOCKOUT_AT, String(Date.now()));
    }
    return count;
}

function resetFailedAttempts() {
    Storage.removeItem(KEYS.LOGIN_FAILS);
    Storage.removeItem(KEYS.LOCKOUT_AT);
}

/**
 * @returns {{ locked: boolean, remainingMs: number }}
 */
function checkLockout() {
    const lockedAt = parseInt(Storage.getItem(KEYS.LOCKOUT_AT) || '0', 10);
    if (!lockedAt) return { locked: false, remainingMs: 0 };

    const elapsed = Date.now() - lockedAt;
    const remainingMs = LOCKOUT_MS - elapsed;

    if (remainingMs <= 0) {
        resetFailedAttempts();
        return { locked: false, remainingMs: 0 };
    }

    return { locked: true, remainingMs };
}

// ── Route / Page Guard ───────────────────────────────────────
/**
 * Call this at the top of any protected page.
 * Redirects to login.html if no valid session exists.
 * @param {'Employee'|'HR'|'Administrator'|null} requiredRole  — null = any authenticated user
 */
function guardPage(requiredRole = null) {
    const session = getSession();

    if (!session) {
        window.location.replace('login.html');
        return;
    }

    if (requiredRole && session.role !== requiredRole && session.role !== 'Administrator') {
        // Employee trying to reach HR page, etc.
        window.location.replace(
            session.role === 'Employee' ? 'employee.html' : 'hr.html'
        );
    }
}

/**
 * Redirect already-logged-in users away from login/signup pages.
 * Call this at the top of login.html and signup.html.
 */
function redirectIfLoggedIn() {
    const session = getSession();
    if (!session) return;

    if (session.role === 'HR' || session.role === 'Administrator') {
        window.location.replace('hr.html');
    } else {
        window.location.replace('employee.html');
    }
}

// ── Logout Helper ─────────────────────────────────────────────
/**
 * Attach to any logout button:  auth.logout()
 */
function logout() {
    destroySession();
    window.location.replace('login.html');
}

// ── Expose as global `auth` object ───────────────────────────
window.auth = {
    hashPassword,
    registerUser,
    verifyLogin,
    createSession,
    getSession,
    destroySession,
    logout,
    guardPage,
    redirectIfLoggedIn,
    checkLockout,
    incrementFailedAttempts,
    resetFailedAttempts,
    getFailedAttempts,
    findUserByEmail,
    findUserByEmpId,
    MAX_ATTEMPTS,
    LOCKOUT_MS,
    Storage,
};

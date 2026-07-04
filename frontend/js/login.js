// ============================================================
//  Nexus HRMS – Login Page JavaScript
//  Depends on: auth.js (loaded first in login.html)
// ============================================================

// Redirect to dashboard if already logged in
auth.redirectIfLoggedIn();

// ── Element References ───────────────────────────────────────
const loginForm          = document.getElementById('loginForm');
const loginEmailInput    = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const toggleLoginPass    = document.getElementById('toggleLoginPassword');
const rememberCheckbox   = document.getElementById('rememberMe');
const loginBtn           = document.getElementById('loginBtn');
const toast              = document.getElementById('toast');

// ── Toggle Password Visibility ───────────────────────────────
toggleLoginPass.addEventListener('click', () => {
    const isPassword = loginPasswordInput.type === 'password';
    loginPasswordInput.type = isPassword ? 'text' : 'password';

    const icon = toggleLoginPass.querySelector('i');
    icon.classList.toggle('fa-eye',       !isPassword);
    icon.classList.toggle('fa-eye-slash',  isPassword);
});

// ── Toast Helper ─────────────────────────────────────────────
function showToast(message, type = 'success') {
    toast.textContent = message;

    if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        toast.style.boxShadow  = '0 20px 50px rgba(239,68,68,0.4)';
    } else if (type === 'warning') {
        toast.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        toast.style.boxShadow  = '0 20px 50px rgba(245,158,11,0.4)';
    } else {
        toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        toast.style.boxShadow  = '0 20px 50px rgba(16,185,129,0.4)';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3800);
}

// ── Lockout UI ───────────────────────────────────────────────
let lockoutTimer = null;

function applyLockout(remainingMs) {
    loginBtn.disabled = true;

    function tick() {
        const { locked, remainingMs: ms } = auth.checkLockout();
        if (!locked) {
            loginBtn.disabled  = false;
            loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
            clearInterval(lockoutTimer);
            return;
        }
        const secs = Math.ceil(ms / 1000);
        loginBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Locked — try again in ${secs}s`;
    }

    tick();
    lockoutTimer = setInterval(tick, 500);
}

// Check lockout on page load (in case user refreshes during lockout)
(function checkOnLoad() {
    const { locked, remainingMs } = auth.checkLockout();
    if (locked) applyLockout(remainingMs);
})();

// ── Input Focus Micro-Animations ─────────────────────────────
document.querySelectorAll('.input-group input').forEach(el => {
    el.addEventListener('focus', () => el.closest('.input-group').classList.add('focused'));
    el.addEventListener('blur',  () => el.closest('.input-group').classList.remove('focused'));
});

// ── Form Submit Handler ──────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ── Check lockout first ──────────────────────────────────
    const lockoutState = auth.checkLockout();
    if (lockoutState.locked) {
        applyLockout(lockoutState.remainingMs);
        showToast(`Too many failed attempts. Try again in ${Math.ceil(lockoutState.remainingMs / 1000)}s.`, 'warning');
        return;
    }

    const email    = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    // ── Basic field validation ───────────────────────────────
    if (!email) {
        showToast('Please enter your email address.', 'error');
        loginEmailInput.focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address.', 'error');
        loginEmailInput.focus();
        return;
    }

    if (!password) {
        showToast('Please enter your password.', 'error');
        loginPasswordInput.focus();
        return;
    }

    // ── Show loading state ───────────────────────────────────
    loginBtn.disabled  = true;
    loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…';

    // ── Verify credentials (SHA-256 hash comparison) ─────────
    const result = await auth.verifyLogin(email, password);

    if (!result.ok) {
        const fails = auth.incrementFailedAttempts();
        const remaining = auth.MAX_ATTEMPTS - fails;

        loginBtn.disabled  = false;
        loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';

        if (remaining <= 0) {
            applyLockout(auth.LOCKOUT_MS);
            showToast('Too many failed attempts. Account locked for 30 seconds.', 'warning');
        } else {
            showToast(`${result.message} ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 'error');
        }
        return;
    }

    // ── Success ──────────────────────────────────────────────
    auth.resetFailedAttempts();
    auth.createSession(result.user, rememberCheckbox?.checked ?? false);

    // Redirect based on the role tied to the logged-in email
    redirectByEmail(result.user);
});

/**
 * Determines the destination page based on the role
 * stored against the user's email, then navigates there.
 * @param {{ name: string, email: string, role: string }} user
 */
function redirectByEmail(user) {
    const isHR = user.role === 'HR' || user.role === 'Administrator';
    const destination = isHR ? 'hr.html' : 'employee.html';
    const label       = isHR ? 'HR Dashboard' : 'Employee Dashboard';

    showToast(`Welcome back, ${user.name}! Redirecting to ${label}… 👋`, 'success');

    loginBtn.disabled         = true;
    loginBtn.innerHTML        = '<i class="fa-solid fa-circle-check"></i> Signing In…';
    loginBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

    setTimeout(() => {
        window.location.href = destination;
    }, 1800);
}

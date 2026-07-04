// ============================================================
//  Nexus HRMS – Signup Page JavaScript
//  Depends on: auth.js (loaded first in signup.html)
// ============================================================

// Redirect to dashboard if already logged in
auth.redirectIfLoggedIn();

// ── Element References ───────────────────────────────────────
const signupForm       = document.getElementById('signupForm');
const nameInput        = document.getElementById('name');
const employeeIdInput  = document.getElementById('employeeId');
const emailInput       = document.getElementById('email');
const phoneInput       = document.getElementById('phone');
const roleSelect       = document.getElementById('role');
const passwordInput    = document.getElementById('password');
const confirmInput     = document.getElementById('confirmPassword');
const termsCheckbox    = document.getElementById('terms');

const togglePassword   = document.getElementById('togglePassword');
const toggleConfirm    = document.getElementById('toggleConfirm');

const strengthFill     = document.getElementById('strengthFill');
const strengthText     = document.getElementById('strengthText');

const ruleLength       = document.getElementById('ruleLength');
const ruleUpper        = document.getElementById('ruleUpper');
const ruleNumber       = document.getElementById('ruleNumber');
const ruleSpecial      = document.getElementById('ruleSpecial');

const toast            = document.getElementById('toast');

// ── Toggle Password Visibility ───────────────────────────────
function toggleVisibility(inputEl, toggleEl) {
    toggleEl.addEventListener('click', () => {
        const isPassword = inputEl.type === 'password';
        inputEl.type = isPassword ? 'text' : 'password';

        const icon = toggleEl.querySelector('i');
        icon.classList.toggle('fa-eye',       !isPassword);
        icon.classList.toggle('fa-eye-slash',  isPassword);
    });
}

toggleVisibility(passwordInput, togglePassword);
toggleVisibility(confirmInput,  toggleConfirm);

// ── Password Strength Meter ──────────────────────────────────
function getPasswordStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8)             score++;
    if (/[A-Z]/.test(pwd))           score++;
    if (/[0-9]/.test(pwd))           score++;
    if (/[^A-Za-z0-9]/.test(pwd))    score++;
    return score;
}

const strengthLevels = [
    { label: 'Too Weak',    color: '#ef4444', width: '25%'  },
    { label: 'Weak',        color: '#f97316', width: '40%'  },
    { label: 'Fair',        color: '#eab308', width: '60%'  },
    { label: 'Strong',      color: '#22c55e', width: '85%'  },
    { label: 'Very Strong', color: '#10b981', width: '100%' },
];

function updateStrengthMeter(pwd) {
    if (!pwd) {
        strengthFill.style.width           = '0%';
        strengthFill.style.backgroundColor = 'transparent';
        strengthText.textContent           = 'Password Strength';
        strengthText.style.color           = '';
        return;
    }
    const score = getPasswordStrength(pwd);
    const level = strengthLevels[score] ?? strengthLevels[0];
    strengthFill.style.width           = level.width;
    strengthFill.style.backgroundColor = level.color;
    strengthText.textContent           = level.label;
    strengthText.style.color           = level.color;
}

// ── Live Password Rules Checker ──────────────────────────────
function updatePasswordRules(pwd) {
    setRule(ruleLength,  pwd.length >= 8,          'Minimum 8 characters');
    setRule(ruleUpper,   /[A-Z]/.test(pwd),         'One uppercase letter');
    setRule(ruleNumber,  /[0-9]/.test(pwd),          'One number');
    setRule(ruleSpecial, /[^A-Za-z0-9]/.test(pwd),   'One special character');
}

function setRule(element, passed, label) {
    element.textContent = `${passed ? '✅' : '❌'} ${label}`;
    element.style.color = passed ? '#22c55e' : '';
}

passwordInput.addEventListener('input', () => {
    updateStrengthMeter(passwordInput.value);
    updatePasswordRules(passwordInput.value);
});

// ── Confirm Password Live Match ──────────────────────────────
confirmInput.addEventListener('input', () => {
    if (confirmInput.value && confirmInput.value !== passwordInput.value) {
        confirmInput.style.borderColor = '#ef4444';
        confirmInput.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.2)';
    } else {
        confirmInput.style.borderColor = '';
        confirmInput.style.boxShadow   = '';
    }
});

// ── Phone Filter ─────────────────────────────────────────────
phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/[^0-9+\-\s()]/g, '');
});

// ── Toast Helper ─────────────────────────────────────────────
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.style.background = type === 'error'
        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
        : 'linear-gradient(135deg, #22c55e, #16a34a)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Client-side Validation ───────────────────────────────────
function validateForm() {
    const name     = nameInput.value.trim();
    const empId    = employeeIdInput.value.trim();
    const email    = emailInput.value.trim();
    const phone    = phoneInput.value.trim();
    const role     = roleSelect.value;
    const password = passwordInput.value;
    const confirm  = confirmInput.value;

    if (!name) {
        showToast('Please enter your full name.', 'error');
        nameInput.focus(); return false;
    }
    if (!empId) {
        showToast('Please enter your Employee ID.', 'error');
        employeeIdInput.focus(); return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid company email.', 'error');
        emailInput.focus(); return false;
    }
    if (phone.replace(/\D/g, '').length < 7) {
        showToast('Please enter a valid phone number.', 'error');
        phoneInput.focus(); return false;
    }
    if (!role) {
        showToast('Please select your role.', 'error');
        roleSelect.focus(); return false;
    }
    if (getPasswordStrength(password) < 4) {
        showToast('Password does not meet all requirements.', 'error');
        passwordInput.focus(); return false;
    }
    if (password !== confirm) {
        showToast('Passwords do not match.', 'error');
        confirmInput.focus(); return false;
    }
    if (!termsCheckbox.checked) {
        showToast('Please accept the Terms & Conditions.', 'error');
        return false;
    }
    return true;
}

// ── Form Submit ──────────────────────────────────────────────
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const btn = signupForm.querySelector('.signup-btn');
    btn.disabled  = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account…';

    // registerUser handles duplicate checks + SHA-256 hashing
    const result = await auth.registerUser({
        name:       nameInput.value.trim(),
        employeeId: employeeIdInput.value.trim(),
        email:      emailInput.value.trim(),
        phone:      phoneInput.value.trim(),
        role:       roleSelect.value,
        password:   passwordInput.value,
    });

    if (!result.ok) {
        // Duplicate email / employee ID
        showToast(result.message, 'error');
        btn.disabled  = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Secure Account';
        return;
    }

    showToast('Account Created Successfully! 🎉', 'success');
    btn.innerHTML        = '<i class="fa-solid fa-circle-check"></i> Account Created!';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

    setTimeout(() => { window.location.href = 'login.html'; }, 2200);
});

// ── Input Focus Micro-Animations ─────────────────────────────
document.querySelectorAll('.input-group input, .input-group select').forEach(el => {
    el.addEventListener('focus', () => el.closest('.input-group').classList.add('focused'));
    el.addEventListener('blur',  () => el.closest('.input-group').classList.remove('focused'));
});

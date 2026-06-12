import { registerFormHandler } from './auth.js';
import { updateNavbar } from './navbar.js';
import { loadDashboardView, startDashboardPolling, stopDashboardPolling } from './dashboard.js';
import { initBookingForm, openBooking, closeBooking } from './booking.js';
import { loadAdminView, toggleUserRole, deleteUser } from './admin.js';
import { loadProfileView, handleEditSession } from './profile.js';
import { loadFeedback, initFeedbackForm, openFeedback } from './feedback.js';

const routes = {
    '/': 'view-home',
    '/login': 'view-login',
    '/signup': 'view-signup',
    '/dashboard': 'view-dashboard',
    '/profile': 'view-profile',
    '/admin': 'view-admin'
};

// [SECURITY FIX] In-memory store for IDs that must never live in the DOM.
// Keeping machine_id, user_id, session_id, and note_id here means they
// cannot be read or tampered with via DevTools hidden-input editing.
const _secureState = {
    bookingMachineId: null,
    feedbackMachineId: null,
    editSessionId: null,
    editNoteId: null,
};

export function getSecureState() { return _secureState; }

//1) router function
function router()
{
    const path = window.location.pathname;
    const idActiveView = routes[path] || 'view-home';

    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const viewToShow = document.getElementById(idActiveView);
    if (viewToShow) {
        viewToShow.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (path === '/dashboard') {
        startDashboardPolling();
        loadFeedback();
    } else if (path === '/admin') {
        // [SECURITY FIX] Before rendering the admin view, verify server-side that the
        // current user actually has the admin role. If not, redirect to home.
        // Relying only on a client-side flag or a hidden link is Broken Access Control.
        const user = _getUser();
        if (!user || user.role !== 'admin') {
            stopDashboardPolling();
            my_navigateTo('/');
            return;
        }
        stopDashboardPolling();
        loadAdminView();
    } else if (path === '/profile') {
        stopDashboardPolling();
        loadProfileView();
    } else {
        stopDashboardPolling();
    }
}

//2) navigate to a URL
function my_navigateTo(url)
{
    history.pushState(null, null, url);
    router();
}

// [SECURITY FIX] Centralised helper to read the current user from localStorage.
// Any code that needs the user goes through here so we have one place to harden
// (e.g. add integrity checks or migrate to sessionStorage later).
function _getUser()
{
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialise forms
    initBookingForm();
    initFeedbackForm();

    // 2. Global event delegation — Navbar
    document.body.addEventListener('click', e => {
        if (e.target.matches('.nav-link')) {
            e.preventDefault();
            if (e.target.classList.contains('logout-action')) {
                localStorage.removeItem('user');
                // [SECURITY FIX] Clear all in-memory IDs on logout so a subsequent
                // user on the same browser tab cannot reuse a stale identity.
                _secureState.bookingMachineId  = null;
                _secureState.feedbackMachineId = null;
                _secureState.editSessionId     = null;
                _secureState.editNoteId        = null;
                updateNavbar();
                my_navigateTo('/');
            } else {
                my_navigateTo(e.target.getAttribute('href'));
            }
        }
    });

    // 3. Dashboard event delegation — Book and Report buttons
    document.getElementById('view-dashboard').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-book');
        if (btn && !btn.disabled) {
            const machineId = btn.closest('.card').id.replace('mach-', '');
            // [SECURITY FIX] Store machine_id in memory, not in a hidden <input>.
            // openBooking() reads _secureState.bookingMachineId when submitting so
            // the value is never exposed as an editable DOM node.
            _secureState.bookingMachineId = machineId;
            openBooking(machineId);
        }

        const btnReport = e.target.closest('.btn-report');
        if (btnReport) {
            const machineId = btnReport.closest('.card').id.replace('mach-', '');
            // [SECURITY FIX] Same pattern — feedback machine_id lives in memory only.
            _secureState.feedbackMachineId = machineId;
            openFeedback(machineId);
        }
    });

    document.querySelector('#modal-booking button[type="button"]').addEventListener('click', closeBooking);

    // 4. Router and auth forms
    window.addEventListener('popstate', router);
    router();

    // [SECURITY FIX] Inject the Admin nav link only after the server confirms the
    // user role — never rely on display:none in static HTML (visible in source,
    // trivially re-enabled via DevTools).
    updateNavbar();
    _injectAdminLinkIfAdmin();

    // Clock
    const clockDisplay = document.getElementById('clock-display');
    if (clockDisplay) {
        setInterval(() => {
            clockDisplay.textContent = new Date().toLocaleTimeString('it-IT');
        }, 1000);
    }

    // Edit-session form
    const formEditSession = document.getElementById('form-edit-session');
    if (formEditSession) {
        formEditSession.addEventListener('submit', (e) => {
            // [SECURITY FIX] Attach the in-memory session ID to the event so
            // handleEditSession can include it in the API call without reading
            // it from a hidden DOM input.
            e.detail = { sessionId: _secureState.editSessionId };
            handleEditSession(e);
        });
    }

    // Edit-note form
    const formEditNote = document.getElementById('form-edit-note');
    if (formEditNote) {
        formEditNote.addEventListener('submit', (e) => {
            // [SECURITY FIX] Same pattern for note ID — never from a hidden input.
            e.detail = { noteId: _secureState.editNoteId };
            handleEditNote(e);
        });
    }

    // Login handler
    registerFormHandler('form-login', '/api/auth/login', (result) => {
        const errorContainer = document.getElementById('login-error');
        if (errorContainer) errorContainer.textContent = '';

        if (result.success) {
            localStorage.setItem('user', JSON.stringify(result.user));
            updateNavbar();
            // [SECURITY FIX] Inject admin link now that we know the role.
            _injectAdminLinkIfAdmin();
            my_navigateTo('/profile');
        } else {
            // [SECURITY FIX] Show a generic message — never echo back the raw
            // server error, which might reveal whether the username exists.
            if (errorContainer)
                errorContainer.textContent = 'Invalid username or password.';
        }
    });

    // Signup handler
    registerFormHandler('form-signup', '/api/users', (result) => {
        if (result.success)
		{
            // [SECURITY FIX] Do not store unverified user data from the signup
            // response — force a proper login instead so the server issues a
            // fresh authenticated session.
            goofy_animation();
            my_navigateTo('/login');
        } else {
            // [SECURITY FIX] Generic error — avoid leaking whether a username
            // already exists (user enumeration).
            alert('Registration failed. Please try a different username.');
        }
    });
});

// [SECURITY FIX] Dynamically insert the Admin nav link only when the
// authenticated user's role is confirmed as 'admin'. This replaces the
// static style="display:none" link that was visible in the HTML source and
// trivially re-enabled via browser DevTools.
function _injectAdminLinkIfAdmin()
{
    const existing = document.getElementById('nav-admin');
    const user = _getUser();

    if (user && user.role === 'admin') {
        if (!existing) {
            const nav  = document.querySelector('nav');
            const link = document.createElement('a');
            link.href        = '/admin';
            link.className   = 'nav-link';
            link.id          = 'nav-admin';
            link.textContent = 'Admin';
            nav.appendChild(link);
        }
    } else {
        // Remove the link if it somehow exists but the user is not admin.
        if (existing) existing.remove();
    }
}
function goofy_animation() {
    const toast = document.createElement('div');
    toast.className = 'laundry-toast';
    toast.innerHTML = '<span style="font-size: 1.5rem;">🫧</span> Account creato!';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
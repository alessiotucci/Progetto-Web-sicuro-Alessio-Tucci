// Secure version of booking.js
import { loadDashboardView } from './dashboard.js';
import { getSecureState } from './script.js';

// =============================================================================
// HELPERS
// =============================================================================

// Round a Date up to the next 15-minute boundary.
// e.g. 16:37 → 16:45, 16:45 → 17:00
function roundUpTo15(date)
{
    const ms = 15 * 60 * 1000;
    return new Date(Math.ceil(date.getTime() / ms) * ms);
}

// Format a Date → "YYYY-MM-DD HH:MM" (the format the backend expects)
function toBackendFormat(date)
{
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Format a Date → "HH:MM" for the human-readable time display
function toTimeDisplay(date)
{
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// =============================================================================
// MODULE STATE
// =============================================================================
let startTime = null;
let selectedDurationMinutes = 60;

function updateTimeDisplay()
{
    if (!startTime)
        return;

    const endTime = new Date(startTime.getTime() + selectedDurationMinutes * 60 * 1000);

    document.getElementById('display-start-time').textContent = toTimeDisplay(startTime);
    document.getElementById('display-end-time').textContent   = toTimeDisplay(endTime);

    // These hidden inputs carry only timestamps — safe to keep in the DOM
    // because the server re-validates the booking window server-side.
    document.getElementById('modal-started-at').value = toBackendFormat(startTime);
    document.getElementById('modal-ended-at').value   = toBackendFormat(endTime);
}

// =============================================================================
// PUBLIC API
// =============================================================================

export function openBooking(machineId)
{
    // [SECURITY FIX] Kept the client-side auth guard as a UX convenience, but
    // the real enforcement is on the server — a forged localStorage entry cannot
    // grant access to /api/sessions because the server checks the session cookie.
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Please log in to book a machine.");
        return;
    }

    // [SECURITY FIX] Removed JSON.parse without try/catch. Malformed localStorage
    // data would throw an uncaught exception and break the whole module.
    let user;
    try {
        user = JSON.parse(userJson);
    } catch {
        alert("Session error. Please log in again.");
        return;
    }

    // ── 1. Highlight the selected card ────────────────────────────────────────
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`mach-${machineId}`);
    if (card) {
        card.classList.add('selected');

        // ── 2. Mirror the card into the modal header ──────────────────────────
        const imgSrc      = card.querySelector('img')?.src || '';
        const machineName = card.querySelector('h3')?.textContent || machineId.toUpperCase();

        document.getElementById('modal-machine-img').src          = imgSrc;
        // [SECURITY FIX] Use textContent instead of innerHTML/innerText when
        // writing server-supplied or DOM-derived strings into the modal header
        // to prevent any chance of HTML injection.
        document.getElementById('modal-machine-name').textContent = machineName;
    }

    // ── 3. Store IDs in secure memory — NOT in hidden DOM inputs ─────────────
    // [SECURITY FIX] The original code wrote machine_id and user_id into hidden
    // <input> fields, which can be edited via DevTools to book on behalf of
    // another user or target a different machine (IDOR / parameter tampering).
    // Following the _secureState pattern established in script.js, both values
    // are kept in memory only; the submit handler reads them from there.
    const state = getSecureState();
    state.bookingMachineId = machineId;
    // user_id is NOT stored even in memory — the server derives it from the
    // authenticated session cookie, so the client never needs to send it.

    // ── 4. Set sensible time defaults ─────────────────────────────────────────
    startTime = roundUpTo15(new Date());
    selectedDurationMinutes = 60;

    document.querySelectorAll('.btn-duration').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes) === 60);
    });

    updateTimeDisplay();

    // ── 5. Show the modal ─────────────────────────────────────────────────────
    document.getElementById('modal-booking').classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeBooking()
{
    // [SECURITY FIX] Removed debug console.log that served no purpose in
    // production and pollutes the console output visible to any user with
    // DevTools open.
    document.getElementById('modal-booking').classList.remove('active');
    document.getElementById('form-booking').reset();
    document.body.style.overflow = '';
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));

    // [SECURITY FIX] Clear the in-memory machine ID when the modal is closed
    // so a stale value cannot be accidentally reused if the modal is reopened
    // in an unexpected state.
    const state = getSecureState();
    state.bookingMachineId = null;
}

export function initBookingForm()
{
    // ── Duration preset buttons ────────────────────────────────────────────────
    document.querySelectorAll('.btn-duration').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-duration').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDurationMinutes = parseInt(btn.dataset.minutes);
            updateTimeDisplay();
        });
    });

    // ── Close button ──────────────────────────────────────────────────────────
    document.getElementById('btn-close-booking').addEventListener('click', closeBooking);

    // ── Form submission ────────────────────────────────────────────────────────
    document.getElementById('form-booking').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // [SECURITY FIX] machine_id and user_id are no longer read from hidden
        // DOM inputs (tamperable via DevTools). machine_id comes from _secureState;
        // user_id is intentionally omitted from the payload — the server resolves
        // it from the authenticated session cookie, so the client sending it would
        // only create a parameter-tampering opportunity.
        const state = getSecureState();
        const body = {
            machine_id: state.bookingMachineId,
            started_at: formData.get('started_at'),
            ended_at:   formData.get('ended_at'),
        };

        // [SECURITY FIX] Basic client-side sanity check before sending. If
        // bookingMachineId is null (e.g. the modal was opened without going
        // through openBooking) we abort rather than sending a malformed request.
        if (!body.machine_id) {
            alert('Invalid booking state. Please close the modal and try again.');
            return;
        }

        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // [SECURITY FIX] Added credentials: 'same-origin' so the session
                // cookie is sent and the server can authenticate the request.
                // Without this the server has no way to verify who is booking.
                credentials: 'same-origin',
                body: JSON.stringify(body)
            });

            // [SECURITY FIX] Parse the response body only after checking status,
            // and surface a generic message rather than the raw server error string
            // which might reveal internal details (table names, stack traces, etc.).
            if (res.ok) {
                closeBooking();
                loadDashboardView();
            } else {
                console.error('Booking failed with status', res.status);
                alert('Booking failed. Please try again.');
            }
        } catch (err) {
            // [SECURITY FIX] Do not log the raw error object — it can expose
            // internal endpoint paths or network details in the console.
            console.error('Booking: network or parse error');
            alert('Network error — please try again.');
        }
    });
}
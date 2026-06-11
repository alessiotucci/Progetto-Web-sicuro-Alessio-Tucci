//import { registerformhandler } from './auth.js';
import { loadDashboardView } from './dashboard.js';

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
// Kept module-level so openBooking and the duration buttons share it.
// =============================================================================
let startTime = null;
let selectedDurationMinutes = 60; // default booking length

// Recalculate end time and update everything visible to the user
function updateTimeDisplay()
{
    if (!startTime)
		return;

    const endTime = new Date(startTime.getTime() + selectedDurationMinutes * 60 * 1000);

    // Update the human-readable display
    document.getElementById('display-start-time').textContent = toTimeDisplay(startTime);
    document.getElementById('display-end-time').textContent   = toTimeDisplay(endTime);

    // Update the hidden inputs that will be submitted with the form
    document.getElementById('modal-started-at').value = toBackendFormat(startTime);
    document.getElementById('modal-ended-at').value   = toBackendFormat(endTime);
}

// =============================================================================
// PUBLIC API
// =============================================================================

export function openBooking(machineId)
{
    // Block unauthenticated users immediately
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Please log in to book a machine.");
        return;
    }
    const user = JSON.parse(userJson);

    // ── 1. Highlight the selected card ────────────────────────────────────────
    // Remove "selected" from any previously highlighted card first
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`mach-${machineId}`);
    if (card) {
        card.classList.add('selected');

        // ── 2. Mirror the card into the modal header ──────────────────────────
        // This gives the user clear visual confirmation of which machine they picked.
        const imgSrc      = card.querySelector('img')?.src || '';
        const machineName = card.querySelector('h3')?.textContent || machineId.toUpperCase();

        document.getElementById('modal-machine-img').src         = imgSrc;
        document.getElementById('modal-machine-name').textContent = machineName;
    }

    // ── 3. Fill hidden form fields ────────────────────────────────────────────
    document.getElementById('modal-machine-id').value = machineId;
    document.getElementById('modal-user-id').value    = user.id;

    // ── 4. Set sensible time defaults ─────────────────────────────────────────
    //startTime = roundUpTo15(new Date()); // start = now, rounded to next :00/:15/:30/:45
    startTime = new Date(); // start = now, rounded to next :00/:15/:30/:45
    selectedDurationMinutes = 60;

    // Reset duration button highlight to the default (1h)
    document.querySelectorAll('.btn-duration').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes) === 60);
    });

    updateTimeDisplay();

    // ── 5. Show the modal ─────────────────────────────────────────────────────
    document.getElementById('modal-booking').classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent background scroll while modal is open
}
/* CloseBooking */
export function closeBooking()
{
	console.log("DEBUG LOG: Close booking function!");
    document.getElementById('modal-booking').classList.remove('active');
    document.getElementById('form-booking').reset();
    document.body.style.overflow = '';
    // Remove selection highlight when user cancels
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
}

export function initBookingForm() {
    // ── Duration preset buttons ────────────────────────────────────────────────
    // Each button carries a data-minutes attribute; clicking it recalculates end time.
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
    // We handle this directly (not via registerFormHandler) because we need to
    // send the pre-computed hidden values, not raw datetime-local strings.
    document.getElementById('form-booking').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const body = {
            machine_id: formData.get('machine_id'),
            user_id:    formData.get('user_id'),
            started_at: formData.get('started_at'), // already formatted by updateTimeDisplay()
            ended_at:   formData.get('ended_at'),
        };

        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await res.json();

            //if (result.success)
			if (res.ok)
			{
                closeBooking();
                loadDashboardView(); // refresh card statuses without resetting the poll interval
            }
			else
			{
                alert(`Booking failed: ${result.message || result.error}`);
            }
        } catch (err) {
            console.error('Booking error:', err);
            alert('Network error — please try again.');
        }
    });
}

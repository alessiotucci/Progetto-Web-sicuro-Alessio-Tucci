// Secure version of booking.js
import { loadDashboardView, getAuthHeaders } from './dashboard.js';
import { getSecureState } from './script.js';



function toBackendFormat(date)
{
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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

    document.getElementById('modal-started-at').value = toBackendFormat(startTime);
    document.getElementById('modal-ended-at').value   = toBackendFormat(endTime);
}

// =============================================================================
// PUBLIC API
// =============================================================================

export function openBooking(machineId)
{
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Please log in to book a machine.");
        return;
    }

    let user;
    try {
        user = JSON.parse(userJson);
    } catch {
        alert("Session error. Please log in again.");
        return;
    }

    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`mach-${machineId}`);
    if (card) {
        card.classList.add('selected');

        const imgSrc      = card.querySelector('img')?.src || '';
        const machineName = card.querySelector('h3')?.textContent || machineId.toUpperCase();

        document.getElementById('modal-machine-img').src          = imgSrc;
        document.getElementById('modal-machine-name').textContent = machineName;
    }

    const state = getSecureState();
    state.bookingMachineId = machineId;

    startTime = new Date();
    selectedDurationMinutes = 60;

    document.querySelectorAll('.btn-duration').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes) === 60);
    });

    updateTimeDisplay();

    document.getElementById('modal-booking').classList.add('active');
    // FIX CSP: Uso una classe invece di style.overflow
    document.body.classList.add('no-scroll');
}

export function closeBooking()
{
    document.getElementById('modal-booking').classList.remove('active');
    document.getElementById('form-booking').reset();
    // FIX CSP: Rimuovo la classe invece di svuotare style.overflow
    document.body.classList.remove('no-scroll');
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));

    const state = getSecureState();
    state.bookingMachineId = null;
}

export function initBookingForm()
{
    document.querySelectorAll('.btn-duration').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-duration').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDurationMinutes = parseInt(btn.dataset.minutes);
            updateTimeDisplay();
        });
    });

    document.getElementById('btn-close-booking').addEventListener('click', closeBooking);

    document.getElementById('form-booking').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const state = getSecureState();
        
        let user;
        try {
            user = JSON.parse(localStorage.getItem('user'));
        } catch {
            alert('User data error. Please log in again.');
            return;
        }

        // FIX: Inserito user_id nel payload. Il backend in api/sessions.py lo richiede esplicitamente.
        const body = {
            user_id: user.id,
            machine_id: state.bookingMachineId,
            started_at: formData.get('started_at'),
            ended_at:   formData.get('ended_at'),
        };

        if (!body.machine_id) {
            alert('Invalid booking state. Please close the modal and try again.');
            return;
        }

        try {
            // FIX: aggiunto lo slash finale e gli header di autenticazione
			const headers = getAuthHeaders();
			headers['Content-Type'] = 'application/json';

            const res = await fetch('/api/sessions/', {
                method: 'POST',
                headers: headers,
                credentials: 'same-origin',
                body: JSON.stringify(body)
            });

            if (res.ok) {
                closeBooking();
                loadDashboardView();
            } else {
                console.error('Booking failed with status', res.status);
                alert('Booking failed. Please try again.');
            }
        } catch (err) {
            console.error('Booking: network or parse error');
            alert('Network error — please try again.');
        }
    });
}
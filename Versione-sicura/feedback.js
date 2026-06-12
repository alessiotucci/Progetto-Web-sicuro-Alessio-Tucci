// Secure version of feedback.js
import { getSecureState } from './script.js';
import { getAuthHeaders } from './dashboard.js';

// =============================================================================
// OPEN / CLOSE
// =============================================================================

export function openFeedback(machineId)
{
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Devi effettuare il login per segnalare un problema.");
        return;
    }

    const card = document.getElementById(`mach-${machineId}`);
    if (card) {
        const machineName = card.querySelector('h3')?.textContent || machineId.toUpperCase();
        document.getElementById('modal-feedback-machine-name').textContent = machineName;
    }

    const state = getSecureState();
    state.feedbackMachineId = machineId;

    document.getElementById('modal-feedback').classList.add('active');
    
    // FIX CSP: Sostituito style inline con la classe CSS
    document.body.classList.add('no-scroll');
}

export function closeFeedback()
{
    document.getElementById('modal-feedback').classList.remove('active');
    document.getElementById('form-feedback').reset();
    
    // FIX CSP: Sostituito style inline con la classe CSS
    document.body.classList.remove('no-scroll');

    const state = getSecureState();
    state.feedbackMachineId = null;
}

// =============================================================================
// INIT
// =============================================================================

export function initFeedbackForm()
{
    document.getElementById('btn-close-feedback').addEventListener('click', closeFeedback);
    document.getElementById('form-feedback').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let user;
        try {
            user = JSON.parse(localStorage.getItem('user'));
        } catch {
            alert("Sessione non valida. Effettua di nuovo il login.");
            return;
        }

        if (!user) return;
        const formData = new FormData(e.target);
        const state = getSecureState();
        
        // FIX 400: Aggiunto user_id richiesto dal backend in api/notes.py
        const body = {
            user_id: user.id,
            machine_id: state.feedbackMachineId,
            content: formData.get('content')
        };

        if (!body.machine_id) {
            alert('Stato non valido. Chiudi il modale e riprova.');
            return;
        }

        if (body.content && body.content.length > 1000) {
            alert('La segnalazione non può superare i 1000 caratteri.');
            return;
        }

        const headers = getAuthHeaders();
        headers['Content-Type'] = 'application/json';
        
        try {
            // FIX URL: Aggiunto lo slash finale
            const res = await fetch('/api/notes/', {
                method: 'POST',
                headers: headers,
                credentials: 'same-origin',
                body: JSON.stringify(body)
            });

            if (res.ok) {
                closeFeedback();
                alert("Segnalazione inviata con successo.");
            } else {
                console.error('Feedback submit failed with status', res.status);
                alert('Impossibile inviare la segnalazione. Riprova più tardi.');
            }
        } catch(err) {
            console.error('Feedback error', err);
            alert('Errore di rete. Riprova più tardi.');
        }
    });
}
// =============================================================================
// LOAD / RENDER FEEDBACK BOARD
// =============================================================================

export async function loadFeedback()
{
    try { 
        const res = await fetch('/api/notes/me', {
            // [SECURITY FIX] Added credentials: 'same-origin' — the notes board
            // should only be visible to authenticated users.
			headers: getAuthHeaders(),
            credentials: 'same-origin'
        });

        if (!res.ok)
        {
            console.error('loadFeedback: unexpected status', res.status);
            return;
        }

        const notes = await res.json();

        // [SECURITY FIX] Validate the response shape before iterating.
        if (!Array.isArray(notes))
        {
            console.error('loadFeedback: unexpected payload shape');
            return;
        }

        const container = document.getElementById('segnalazioni-container');
        if (!container) return;

        if (notes.length === 0) {
            container.textContent = 'Nessuna segnalazione al momento.';
            container.style.cssText = 'color: var(--color-text-muted); font-size: 0.9rem;';
            return;
        }

        // [SECURITY FIX] THE CRITICAL FIX IN THIS FILE.
        // The original code used innerHTML with template literals, directly
        // embedding note.content and note.machine_id from the server into the DOM.
        // This is a stored XSS vulnerability: an attacker who submits a note with
        // content like <img src=x onerror="steal(document.cookie)"> would have
        // that script execute in every user's browser that views the feedback board.
        // The fix builds each element with DOM APIs and sets all server-supplied
        // values via textContent, which always treats the value as plain text
        // and never parses it as HTML — regardless of what the server returns.
        container.innerHTML = '';

        notes.forEach(note => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                background-color: var(--color-surface);
                padding: var(--space-sm) var(--space-md);
                border-radius: var(--radius-sm);
                border-left: 3px solid var(--color-danger);
                margin-bottom: var(--space-sm);
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            `;

            const label = document.createElement('span');
            label.style.cssText = 'font-size: 0.7rem; font-weight: bold; color: var(--color-text-muted);';
            // textContent — safe against XSS regardless of machine_id value.
            label.textContent = `Macchina ID: ${note.machine_id}`;

            const content = document.createElement('p');
            content.style.cssText = 'margin-top: 4px; font-size: 0.9rem;';
            // textContent — the core fix. A malicious note.content is rendered
            // as literal text, never executed as HTML or JavaScript.
            content.textContent = note.content;

            wrapper.appendChild(label);
            wrapper.appendChild(content);
            container.appendChild(wrapper);
        });

    } catch (err) {
        // [SECURITY FIX] Do not log the raw error object.
        console.error('loadFeedback: failed to load');
    }
}

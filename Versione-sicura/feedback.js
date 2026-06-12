// Secure version of feedback.js
// feedback.js
import { getSecureState } from './script.js';

// =============================================================================
// OPEN / CLOSE
// =============================================================================

export function openFeedback(machineId)
{
    // [SECURITY FIX] Kept as a UX guard only — real auth enforcement is server-side.
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Devi effettuare il login per segnalare un problema.");
        return;
    }

    const card = document.getElementById(`mach-${machineId}`);
    if (card) {
        const machineName = card.querySelector('h3')?.textContent || machineId.toUpperCase();
        // textContent is already used here — no change needed, this is correct.
        document.getElementById('modal-feedback-machine-name').textContent = machineName;
    }

    // [SECURITY FIX] Removed the hidden <input> write for machine_id.
    // Storing it in a DOM input exposes it to DevTools tampering (IDOR risk —
    // a user could change the ID to submit a report against any machine).
    // The ID is kept in _secureState in memory instead, consistent with the
    // pattern used in booking.js.
    const state = getSecureState();
    state.feedbackMachineId = machineId;

    document.getElementById('modal-feedback').classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeFeedback()
{
    document.getElementById('modal-feedback').classList.remove('active');
    document.getElementById('form-feedback').reset();
    document.body.style.overflow = '';

    // [SECURITY FIX] Clear the in-memory machine ID on close so a stale value
    // cannot be reused if the modal is reopened in an unexpected state.
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

        // [SECURITY FIX] Wrap localStorage read in try/catch — malformed data
        // would otherwise throw an uncaught exception and break the handler.
        let user;
        try {
            user = JSON.parse(localStorage.getItem('user'));
        } catch {
            alert("Sessione non valida. Effettua di nuovo il login.");
            return;
        }

        if (!user) return;

        const formData = new FormData(e.target);

        // [SECURITY FIX] machine_id is read from _secureState (memory), not from
        // the hidden DOM input that was removed from the HTML. user_id is
        // intentionally omitted from the payload — the server must resolve it
        // from the authenticated session cookie, not trust a client-supplied value.
        const state = getSecureState();
        const body = {
            machine_id: state.feedbackMachineId,
            content:    formData.get('content')
        };

        // [SECURITY FIX] Abort if machine_id is missing — the modal was somehow
        // submitted without going through openFeedback().
        if (!body.machine_id) {
            alert('Stato non valido. Chiudi il modale e riprova.');
            return;
        }

        // [SECURITY FIX] Client-side length guard mirrors the maxlength="1000"
        // added to the textarea in the HTML. Defence-in-depth: even if the HTML
        // attribute is bypassed (e.g. via DevTools or a raw HTTP request), the
        // JS layer rejects oversized payloads before they reach the network.
        if (body.content && body.content.length > 1000) {
            alert('La segnalazione non può superare i 1000 caratteri.');
            return;
        }

        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // [SECURITY FIX] Added credentials: 'same-origin' so the server
                // can authenticate the request via session cookie and reject
                // unauthenticated submissions.
                credentials: 'same-origin',
                body: JSON.stringify(body)
            });

            if (res.ok) {
                closeFeedback();
                alert("Segnalazione inviata con successo.");
            } else {
                // [SECURITY FIX] Do not echo the raw server error string into the
                // alert — it may reveal internal details. Show a generic message.
                console.error('Feedback submit failed with status', res.status);
                alert('Impossibile inviare la segnalazione. Riprova più tardi.');
            }
        } catch (err) {
            // [SECURITY FIX] Do not log the raw error object to the console.
            console.error('Feedback: network or parse error');
            alert("Errore di rete. Riprova più tardi.");
        }
    });
}

// =============================================================================
// LOAD / RENDER FEEDBACK BOARD
// =============================================================================

export async function loadFeedback()
{
    try {
        const res = await fetch('/api/notes', {
            // [SECURITY FIX] Added credentials: 'same-origin' — the notes board
            // should only be visible to authenticated users.
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

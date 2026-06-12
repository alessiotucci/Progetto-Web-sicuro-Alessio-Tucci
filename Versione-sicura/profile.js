// Secure version of profile.js
// versione-sicura/profile.js
import { getSecureState } from './script.js';

// Helper per formattare le date
function formatDisplayDate(dateStr)
{
    if (!dateStr) return "In corso...";
    return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export async function loadProfileView()
{
    // [SECURITY FIX] Removed debug console.log statements that leaked internal
    // state and API response data to anyone with DevTools open.

    // [SECURITY FIX] Wrapped localStorage read in try/catch — malformed data
    // would otherwise throw and leave the profile view broken.
    let user;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch {
        localStorage.removeItem('user');
        return;
    }
    if (!user) return;

    try {
        // [SECURITY FIX] Use /api/sessions/me instead of /api/sessions/ (all sessions).
        // The original code fetched every session in the system and filtered client-side
        // by username — this is an Insecure Direct Object Reference: any authenticated
        // user could see every other user's bookings by inspecting the network response.
        // The /me endpoint returns only the sessions belonging to the authenticated user,
        // enforced server-side via the session cookie.
        const resSessions = await fetch('/api/sessions/me', { credentials: 'same-origin' });

        // [SECURITY FIX] Check HTTP status before parsing — a 401/403 must not be
        // silently treated as an empty list.
        if (!resSessions.ok)
        {
            console.error('loadProfileView: /api/sessions/me returned', resSessions.status);
            return;
        }

        const mySessions = await resSessions.json();

        // [SECURITY FIX] Validate response shape before iterating.
        if (!Array.isArray(mySessions))
        {
            console.error('loadProfileView: unexpected sessions payload');
            return;
        }

        const containerSessions = document.getElementById('my-sessions-container');
        containerSessions.innerHTML = '';

        if (mySessions.length === 0)
        {
            const p = document.createElement('p');
            p.textContent = 'Nessuna prenotazione attiva.';
            p.style.cssText = 'text-align:center; width:100%; color: var(--color-text-muted);';
            containerSessions.appendChild(p);
        }
        else
        {
            // [SECURITY FIX] Build cards with DOM APIs instead of innerHTML string
            // concatenation. Server-supplied strings (machine_name, dates) injected
            // via innerHTML are a stored XSS vector. textContent neutralises them.
            // [SECURITY FIX] Replaced inline onclick="..." attributes with
            // addEventListener — inline handlers bypass CSP script-src directives
            // and require manual escaping of every interpolated value.
            mySessions.forEach(s => {
                const card = document.createElement('div');
                card.className = 'card profile-card';

                const h3 = document.createElement('h3');
                h3.textContent = s.machine_name;

                const pStart = document.createElement('p');
                pStart.innerHTML = '<strong>Inizio:</strong>';
                pStart.appendChild(document.createTextNode(` ${formatDisplayDate(s.started_at)}`));

                const pEnd = document.createElement('p');
                pEnd.innerHTML = '<strong>Fine:</strong>';
                pEnd.appendChild(document.createTextNode(` ${formatDisplayDate(s.ended_at)}`));

                const actions = document.createElement('div');
                actions.className = 'card-actions';

                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn-edit';
                btnEdit.textContent = 'Modifica prenotazione';
                // [SECURITY FIX] Pass typed values through a closure — no
                // string interpolation into attribute values, no escaping needed.
                btnEdit.addEventListener('click', () =>
                    openEditSession(s.id, s.machine_name, s.started_at, s.ended_at)
                );

                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-delete';
                btnDelete.textContent = 'Cancella prenotazione';
                btnDelete.addEventListener('click', () => deleteSession(s.id));

                actions.appendChild(btnEdit);
                actions.appendChild(btnDelete);
                card.appendChild(h3);
                card.appendChild(pStart);
                card.appendChild(pEnd);
                card.appendChild(actions);
                containerSessions.appendChild(card);
            });
        }

        // [SECURITY FIX] Use /api/notes/me — same IDOR fix as sessions above.
        // The original code fetched all notes system-wide and filtered by username
        // client-side, exposing every user's reports in the network tab.
        const resNotes = await fetch('/api/notes/me', { credentials: 'same-origin' });

        if (!resNotes.ok)
        {
            console.error('loadProfileView: /api/notes/me returned', resNotes.status);
            return;
        }

        const myNotes = await resNotes.json();

        if (!Array.isArray(myNotes))
        {
            console.error('loadProfileView: unexpected notes payload');
            return;
        }

        const containerNotes = document.getElementById('my-notes-container');
        containerNotes.innerHTML = '';

        if (myNotes.length === 0)
        {
            const p = document.createElement('p');
            p.textContent = 'Non hai segnalato alcun problema.';
            p.style.cssText = 'text-align:center; width:100%; color: var(--color-text-muted);';
            containerNotes.appendChild(p);
        }
        else
        {
            myNotes.forEach(n => {
                const card = document.createElement('div');
                card.className = 'card profile-card';
                card.style.borderTopColor = 'var(--color-danger)';

                const h3 = document.createElement('h3');
                // [SECURITY FIX] textContent — n.name is server-supplied.
                h3.textContent = `Macchina: ${n.name}`;

                const pContent = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = 'Segnalazione: ';
                // [SECURITY FIX] This is the stored XSS fix for the notes list.
                // The original code wrote n.content directly into innerHTML —
                // a note containing <script>...</script> or <img onerror=...>
                // would execute in the profile page. textContent prevents this.
                pContent.appendChild(strong);
                pContent.appendChild(document.createTextNode(n.content));

                const actions = document.createElement('div');
                actions.className = 'card-actions';

                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn-edit';
                btnEdit.textContent = 'Modifica';
                // [SECURITY FIX] Note ID and content passed via closure, not via
                // data-* attributes with manual quote-escaping (the original used
                // .replace(/"/g, '&quot;') which misses other dangerous characters).
                btnEdit.addEventListener('click', () => openEditNote(n.id, n.content));

                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-delete';
                btnDelete.textContent = 'Cancella';
                btnDelete.addEventListener('click', () => deleteNote(n.id));

                actions.appendChild(btnEdit);
                actions.appendChild(btnDelete);
                card.appendChild(h3);
                card.appendChild(pContent);
                card.appendChild(actions);
                containerNotes.appendChild(card);
            });
        }

    } catch (e) {
        // [SECURITY FIX] Do not log the raw error object.
        console.error('loadProfileView: unexpected error');
    }
}

// =============================================================================
// SESSION CRUD
// =============================================================================

export async function deleteSession(sessionId)
{
    if (!confirm("Sei sicuro di voler cancellare questa prenotazione?")) return;

    try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            // [SECURITY FIX] credentials: 'same-origin' on all mutating requests
            // so the server can verify ownership via the session cookie and reject
            // attempts to delete another user's booking (IDOR).
            credentials: 'same-origin'
        });
        if (res.ok)
        {
            loadProfileView();
        }
        else
        {
            alert("Errore durante la cancellazione.");
        }
    } catch (e) {
        console.error('deleteSession: network error');
    }
}

let editStartTime       = null;
let editDurationMinutes = 60;

function updateEditTimeDisplay()
{
    if (!editStartTime) return;
    const endTime = new Date(editStartTime.getTime() + editDurationMinutes * 60 * 1000);

    const toTime   = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const pad      = n => String(n).padStart(2, '0');
    const toBackend = d =>
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    document.getElementById('edit-display-start-time').textContent = toTime(editStartTime);
    document.getElementById('edit-display-end-time').textContent   = toTime(endTime);
    document.getElementById('edit-ended-at').value                 = toBackend(endTime);
}

export function openEditSession(sessionId, machineName, startedAt, endedAt)
{
    // [SECURITY FIX] Store the session ID in _secureState (memory) instead of
    // writing it to a hidden <input>. A hidden input is editable via DevTools and
    // could be changed to target another user's session (IDOR).
    const state = getSecureState();
    state.editSessionId = sessionId;

    // started_at lives in a hidden input only as a timestamp reference for the
    // duration picker — the server re-validates the final window server-side.
    document.getElementById('edit-started-at').value = startedAt;
    // [SECURITY FIX] textContent for server-supplied machine name.
    document.getElementById('edit-machine-name').textContent = machineName;

    editStartTime = new Date(startedAt);
    const endTime = new Date(endedAt);
    editDurationMinutes = Math.round((endTime - editStartTime) / 60000);
    if (editDurationMinutes <= 0) editDurationMinutes = 60;

    document.querySelectorAll('#edit-duration-buttons .btn-duration').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes) === editDurationMinutes);
        // [SECURITY FIX] Use addEventListener instead of assigning to btn.onclick.
        // Assigning to .onclick replaces any previously registered handler silently
        // and cannot be cleaned up reliably; addEventListener is explicit and
        // consistent with the rest of the codebase.
        btn.addEventListener('click', () => {
            document.querySelectorAll('#edit-duration-buttons .btn-duration')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editDurationMinutes = parseInt(btn.dataset.minutes);
            updateEditTimeDisplay();
        });
    });

    updateEditTimeDisplay();
    document.getElementById('modal-edit-session').classList.add('active');
}

export function closeEditSession()
{
    document.getElementById('modal-edit-session').classList.remove('active');
    // [SECURITY FIX] Clear the in-memory session ID when the modal closes.
    const state = getSecureState();
    state.editSessionId = null;
}

export async function handleEditSession(e)
{
    e.preventDefault();

    // [SECURITY FIX] Read session ID from _secureState, not from a hidden input.
    const state     = getSecureState();
    const sessionId = e.detail?.sessionId ?? state.editSessionId;
    const startedAt = document.getElementById('edit-started-at').value;
    const endedAt   = document.getElementById('edit-ended-at').value;

    if (!sessionId)
    {
        alert('Stato non valido. Chiudi il modale e riprova.');
        return;
    }

    try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            // [SECURITY FIX] credentials: 'same-origin' — server verifies ownership.
            credentials: 'same-origin',
            body: JSON.stringify({ started_at: startedAt, ended_at: endedAt })
        });

        if (res.ok)
        {
            closeEditSession();
            loadProfileView();
        }
        else
        {
            alert("Errore durante l'aggiornamento.");
        }
    } catch (error) {
        console.error('handleEditSession: network error');
    }
}

// =============================================================================
// NOTE CRUD
// =============================================================================

export async function deleteNote(noteId)
{
    if (!confirm("Sei sicuro di voler cancellare questa segnalazione?")) return;

    try {
        const res = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE',
            // [SECURITY FIX] credentials: 'same-origin' — server verifies ownership
            // so a user cannot delete another user's note by guessing its ID.
            credentials: 'same-origin'
        });
        if (res.ok)
        {
            loadProfileView();
        }
        else
        {
            alert("Errore durante la cancellazione.");
        }
    } catch (e) {
        console.error('deleteNote: network error');
    }
}

export function openEditNote(noteId, content)
{
    // [SECURITY FIX] The original function accepted a button DOM element and
    // read noteId / content from data-* attributes, which required manual HTML
    // escaping and exposed the ID in the DOM. The function now receives typed
    // values directly from the closure in loadProfileView().
    // The note ID is stored in _secureState; only content goes into the textarea
    // (a visible, user-editable field — appropriate for content but not for IDs).
    const state = getSecureState();
    state.editNoteId = noteId;

    document.getElementById('edit-note-content').value = content;
    document.getElementById('modal-edit-note').classList.add('active');
}

export function closeEditNote()
{
    document.getElementById('modal-edit-note').classList.remove('active');
    // [SECURITY FIX] Clear the in-memory note ID on close.
    const state = getSecureState();
    state.editNoteId = null;
}

export async function handleEditNote(e)
{
    e.preventDefault();

    // [SECURITY FIX] Read note ID from _secureState, not from a hidden input.
    const state   = getSecureState();
    const noteId  = e.detail?.noteId ?? state.editNoteId;
    const content = document.getElementById('edit-note-content').value;

    if (!noteId)
    {
        alert('Stato non valido. Chiudi il modale e riprova.');
        return;
    }

    // [SECURITY FIX] Client-side length guard mirrors the server-side limit
    // and the maxlength="1000" on the textarea in the HTML.
    if (content && content.length > 1000)
    {
        alert('La segnalazione non può superare i 1000 caratteri.');
        return;
    }

    try {
        const res = await fetch(`/api/notes/${noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ content })
        });

        if (res.ok)
        {
            closeEditNote();
            loadProfileView();
        }
        else
        {
            alert("Errore durante l'aggiornamento.");
        }
    } catch (error) {
        console.error('handleEditNote: network error');
    }
}

// =============================================================================
// INIT
// =============================================================================

// [SECURITY FIX] The DOMContentLoaded listener for form-edit-note is removed
// here — it is registered centrally in script.js alongside all other form
// handlers. Having it in two places created a double-submission risk.

// [SECURITY FIX] Only expose to window what the HTML strictly requires for
// closeEditSession and closeEditNote (called from inline modal close buttons
// in the HTML that have not yet been migrated to addEventListener).
// All other functions are wired via addEventListener in loadProfileView() and
// do not need to be globals — reducing the window pollution and the attack
// surface for prototype pollution.
window.closeEditSession = closeEditSession;
window.closeEditNote    = closeEditNote;

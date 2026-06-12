// Secure version of profile.js
// versione-sicura/profile.js
import { getSecureState } from './script.js';
import { getAuthHeaders } from './dashboard.js';

// Helper per formattare le date
function formatDisplayDate(dateStr)
{
    if (!dateStr) return "In corso...";
    return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export async function loadProfileView()
{
    let user;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch {
        localStorage.removeItem('user');
        return;
    }
    if (!user) return;

    const headers = getAuthHeaders();

    try {
        // Invece di fare il Fetch di tutte le sessioni e filtro lato client per l'utente loggato.
		// [FIX] chiamiamo il nuovo endpoint creato ad-hoc.
        
        const resSessions = await fetch('/api/sessions/me', { 
            credentials: 'same-origin',
            headers: headers 
        });

        if (!resSessions.ok)
        {
            console.error('loadProfileView: /api/sessions/me returned', resSessions.status);
            return;
        }

        const allSessions = await resSessions.json();

        if (!Array.isArray(allSessions))
        {
            console.error('loadProfileView: unexpected sessions payload');
            return;
        }

        const mySessions = allSessions.filter(s => s.username === user.username);

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

        const resNotes = await fetch('/api/notes/me', { 
            credentials: 'same-origin',
            headers: headers
        });

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
                h3.textContent = `Macchina: ${n.name}`;

                const pContent = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = 'Segnalazione: ';
                pContent.appendChild(strong);
                pContent.appendChild(document.createTextNode(n.content));

                const actions = document.createElement('div');
                actions.className = 'card-actions';

                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn-edit';
                btnEdit.textContent = 'Modifica';
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
            credentials: 'same-origin',
            headers: getAuthHeaders()
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
    const state = getSecureState();
    state.editSessionId = sessionId;

    document.getElementById('edit-started-at').value = startedAt;
    document.getElementById('edit-machine-name').textContent = machineName;

    editStartTime = new Date(startedAt);
    const endTime = new Date(endedAt);
    editDurationMinutes = Math.round((endTime - editStartTime) / 60000);
    if (editDurationMinutes <= 0) editDurationMinutes = 60;

    document.querySelectorAll('#edit-duration-buttons .btn-duration').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes) === editDurationMinutes);
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
    const state = getSecureState();
    state.editSessionId = null;
}

export async function handleEditSession(e)
{
    e.preventDefault();

    const state     = getSecureState();
    const sessionId = e.detail?.sessionId ?? state.editSessionId;
    const startedAt = document.getElementById('edit-started-at').value;
    const endedAt   = document.getElementById('edit-ended-at').value;

    if (!sessionId)
    {
        alert('Stato non valido. Chiudi il modale e riprova.');
        return;
    }
	//same quick fix
	const headers = getAuthHeaders();
	headers['Content-Type'] = 'application/json';
    try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
            method: 'PUT',
            headers: headers,
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
            credentials: 'same-origin',
            headers: getAuthHeaders()
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
    const state = getSecureState();
    state.editNoteId = noteId;

    document.getElementById('edit-note-content').value = content;
    document.getElementById('modal-edit-note').classList.add('active');
}

export function closeEditNote()
{
    document.getElementById('modal-edit-note').classList.remove('active');
    const state = getSecureState();
    state.editNoteId = null;
}

export async function handleEditNote(e)
{
    e.preventDefault();

    const state   = getSecureState();
    const noteId  = e.detail?.noteId ?? state.editNoteId;
    const content = document.getElementById('edit-note-content').value;

    if (!noteId)
    {
        alert('Stato non valido. Chiudi il modale e riprova.');
        return;
    }

    if (content && content.length > 1000)
    {
        alert('La segnalazione non può superare i 1000 caratteri.');
        return;
    }

	try {
        const headers = getAuthHeaders();
        headers['Content-Type'] = 'application/json';

        const res = await fetch(`/api/notes/${noteId}`, {
            method: 'PUT',
            headers: headers,
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

window.closeEditSession = closeEditSession;
window.closeEditNote    = closeEditNote;

// =============================================================================
// INIT (Listeners for Modals)
// =============================================================================

// Modale: Edit Session
document.getElementById('btn-close-edit-session')?.addEventListener('click', closeEditSession);
document.getElementById('form-edit-session')?.addEventListener('submit', handleEditSession);

// Modale: Edit Note
document.getElementById('btn-close-edit-note')?.addEventListener('click', closeEditNote);
document.getElementById('form-edit-note')?.addEventListener('submit', handleEditNote);
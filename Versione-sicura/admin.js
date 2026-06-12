import { getAuthHeaders } from './dashboard.js';

export async function loadAdminView() {
    // Esegue le tre chiamate in parallelo
    await Promise.all([
        loadAdminUsers(),
        loadAdminSessions(),
        loadAdminNotes()
    ]);
}

// =============================================================================
// UTENTI
// =============================================================================

async function loadAdminUsers() {
    try {
        const res = await fetch('/api/users/', {
            credentials: 'same-origin',
            headers: getAuthHeaders()
        });

        if (!res.ok) return console.error('loadAdminUsers: status', res.status);
        
        const users = await res.json();
        if (!Array.isArray(users)) return;

        const container = document.getElementById('admin-users-container');
        if (!container) return;

        container.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'admin-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Ruolo</th>
                <th>Azioni</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        users.forEach(u => {
            const tr = document.createElement('tr');

            const tdId = document.createElement('td'); tdId.textContent = u.id;
            const tdUsername = document.createElement('td'); tdUsername.textContent = u.username;
            const tdRole = document.createElement('td'); tdRole.textContent = u.role;

            const tdActions = document.createElement('td');
            tdActions.className = 'actions-cell'; 

            const btnToggle = document.createElement('button');
            btnToggle.className = 'btn-edit';
            btnToggle.textContent = u.role === 'admin' ? 'Revoca Admin' : 'Rendi Admin';
            btnToggle.addEventListener('click', () => toggleUserRole(u.id, u.role));

            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-delete';
            btnDelete.textContent = 'Elimina';
            btnDelete.addEventListener('click', () => deleteUser(u.id));

            tdActions.appendChild(btnToggle);
            tdActions.appendChild(btnDelete);

            tr.appendChild(tdId);
            tr.appendChild(tdUsername);
            tr.appendChild(tdRole);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);

    } catch (e) {
        console.error('loadAdminUsers: error', e); 
    }
}

export async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Sei sicuro di voler cambiare il ruolo in ${newRole}?`)) return;

    try {
        const headers = getAuthHeaders();
        headers['Content-Type'] = 'application/json';

        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: headers,
            body: JSON.stringify({ role: newRole })
        });

        if (res.ok) loadAdminUsers();
        else alert("Errore durante l'aggiornamento del ruolo.");
    } catch (e) {
        console.error('toggleUserRole error', e);
    }
}

export async function deleteUser(userId) {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;

    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: getAuthHeaders()
        });

        if (res.ok) loadAdminUsers();
        else alert("Errore durante l'eliminazione dell'utente.");
    } catch (e) {
        console.error('deleteUser error', e);
    }
}

// =============================================================================
// PRENOTAZIONI (SESSIONI)
// =============================================================================

async function loadAdminSessions() {
    try {
        const res = await fetch('/api/sessions/', {
            credentials: 'same-origin',
            headers: getAuthHeaders()
        });

        if (!res.ok) return console.error('loadAdminSessions: status', res.status);
        
        const sessions = await res.json();
        if (!Array.isArray(sessions)) return;

        const container = document.getElementById('admin-sessions-container');
        if (!container) return;

        container.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'admin-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Utente</th>
                <th>Macchina</th>
                <th>Inizio</th>
                <th>Fine</th>
                <th>Azioni</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        sessions.forEach(s => {
            const tr = document.createElement('tr');

            const tdId = document.createElement('td'); tdId.textContent = s.id;
            const tdUser = document.createElement('td'); tdUser.textContent = s.username || 'Sconosciuto';
            const tdMachine = document.createElement('td'); tdMachine.textContent = s.machine_name;
            
            // Format date for better readability
            const formatOpt = { dateStyle: 'short', timeStyle: 'short' };
            const tdStart = document.createElement('td'); 
            tdStart.textContent = new Date(s.started_at).toLocaleString('it-IT', formatOpt);
            
            const tdEnd = document.createElement('td'); 
            tdEnd.textContent = new Date(s.ended_at).toLocaleString('it-IT', formatOpt);

            const tdActions = document.createElement('td');
            tdActions.className = 'actions-cell'; 

            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-delete';
            btnDelete.textContent = 'Elimina';
            btnDelete.addEventListener('click', () => deleteAdminSession(s.id));

            tdActions.appendChild(btnDelete);

            tr.appendChild(tdId);
            tr.appendChild(tdUser);
            tr.appendChild(tdMachine);
            tr.appendChild(tdStart);
            tr.appendChild(tdEnd);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);

    } catch (e) {
        console.error('loadAdminSessions: error', e); 
    }
}

async function deleteAdminSession(sessionId) {
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione?")) return;

    try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: getAuthHeaders()
        });

        if (res.ok) loadAdminSessions();
        else alert("Errore durante l'eliminazione della prenotazione.");
    } catch (e) {
        console.error('deleteAdminSession error', e);
    }
}

// =============================================================================
// SEGNALAZIONI (NOTE)
// =============================================================================

async function loadAdminNotes() {
    try {
        const res = await fetch('/api/notes/', {
            credentials: 'same-origin',
            headers: getAuthHeaders()
        });

        if (!res.ok) return console.error('loadAdminNotes: status', res.status);
        
        const notes = await res.json();
        if (!Array.isArray(notes)) return;

        const container = document.getElementById('admin-notes-container');
        if (!container) return;

        container.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'admin-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Utente</th>
                <th>Macchina</th>
                <th>Problema</th>
                <th>Azioni</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        notes.forEach(n => {
            const tr = document.createElement('tr');

            const tdId = document.createElement('td'); tdId.textContent = n.id;
            const tdUser = document.createElement('td'); tdUser.textContent = n.username || 'Sconosciuto';
            const tdMachine = document.createElement('td'); tdMachine.textContent = n.name;
            const tdContent = document.createElement('td'); tdContent.textContent = n.content;

            const tdActions = document.createElement('td');
            tdActions.className = 'actions-cell'; 

            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-delete';
            btnDelete.textContent = 'Elimina';
            btnDelete.addEventListener('click', () => deleteAdminNote(n.id));

            tdActions.appendChild(btnDelete);

            tr.appendChild(tdId);
            tr.appendChild(tdUser);
            tr.appendChild(tdMachine);
            tr.appendChild(tdContent);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);

    } catch (e) {
        console.error('loadAdminNotes: error', e); 
    }
}

async function deleteAdminNote(noteId) {
    if (!confirm("Sei sicuro di voler eliminare questa segnalazione?")) return;

    try {
        const res = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: getAuthHeaders()
        });

        if (res.ok) loadAdminNotes();
        else alert("Errore durante l'eliminazione della segnalazione.");
    } catch (e) {
        console.error('deleteAdminNote error', e);
    }
}
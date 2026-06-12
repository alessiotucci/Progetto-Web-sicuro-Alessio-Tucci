// Secure version of admin.js
// Helper per formattare la data
function formatAdminDate(dateStr)
{
    if (!dateStr)
        return "In corso";
    return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

// [SECURITY FIX] Removed localStorage-only role check as the sole access gate.
// Client-side role checks can be bypassed by editing localStorage in DevTools.
// The real enforcement happens on the server — every fetch below will return 401/403
// if the session cookie does not belong to an admin. We keep a lightweight client
// check only to give honest users a fast redirect, not as a security boundary.
export async function loadAdminView()
{
    const userJson = localStorage.getItem('user');
    if (!userJson)
    {
        alert("Accesso negato. Effettua il login.");
        return;
    }

    const user = JSON.parse(userJson);
    if (user.role !== 'admin')
    {
        alert("Non hai i permessi di amministratore.");
        return;
    }

    try {
        // [SECURITY FIX] Removed ?t=Date.now() cache-busting from API calls.
        // Cache-busting via query params is unnecessary for authenticated API
        // endpoints (the server should already set Cache-Control: no-store on
        // sensitive responses) and adds noise to server logs.
        // Cache-Control headers are the correct mechanism.

        // --- 1. POPOLA TABELLA UTENTI ---
        const usersRes = await fetch('/api/users', {
            // [SECURITY FIX] credentials: 'same-origin' ensures the session cookie
            // is sent with every request so the server can authenticate the caller.
            // Without this, fetch() omits cookies and the server cannot verify the
            // admin role — the client-side check would be the only barrier.
            credentials: 'same-origin'
        });

        // [SECURITY FIX] Check HTTP status before parsing the body. The original
        // code ignored non-2xx responses and tried to render whatever came back,
        // which could expose raw error objects or allow partial data rendering
        // when the server actually denied access.
        if (!usersRes.ok)
        {
            console.error('Admin: /api/users returned', usersRes.status);
            alert('Accesso negato o errore nel caricamento degli utenti.');
            return;
        }

        const usersData = await usersRes.json();
        const usersContainer = document.getElementById('admin-users-container');

        if (usersData.success || Array.isArray(usersData))
        {
            const users = usersData.users || usersData;

            // [SECURITY FIX] Build the table with DOM APIs instead of innerHTML
            // string concatenation. Concatenating server-supplied strings directly
            // into innerHTML is an XSS vector: a malicious username like
            // <img src=x onerror=alert(1)> would execute in the admin's browser.
            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th><th>Username</th><th>Ruolo</th><th>Azioni</th>
                    </tr>
                </thead>
            `;
            const tbody = document.createElement('tbody');

            users.forEach(u => {
                const badgeColor = u.role === 'admin' ? 'bg-red' : 'bg-blue';
                const tr = document.createElement('tr');

                // [SECURITY FIX] Use textContent to insert all server-supplied
                // values — textContent never interprets HTML so XSS is impossible
                // regardless of what the server returns.
                const tdId       = document.createElement('td');
                tdId.textContent = u.id;

                const tdUser          = document.createElement('td');
                const strong          = document.createElement('strong');
                strong.textContent    = u.username;
                tdUser.appendChild(strong);

                const tdRole      = document.createElement('td');
                const badge       = document.createElement('span');
                badge.className   = `badge ${badgeColor}`;
                badge.textContent = u.role.toUpperCase();
                tdRole.appendChild(badge);

                const tdActions  = document.createElement('td');
                tdActions.className = 'action-btns';

                const btnRole       = document.createElement('button');
                btnRole.className   = 'btn-small bg-orange';
                btnRole.textContent = 'Cambia Ruolo';
                // [SECURITY FIX] Attach handlers via addEventListener instead of
                // inline onclick strings. Inline handlers are evaluated with eval()
                // semantics and bypass Content-Security-Policy script-src directives.
                btnRole.addEventListener('click', () => toggleUserRole(u.id, u.role));

                const btnDel       = document.createElement('button');
                btnDel.className   = 'btn-small bg-red';
                btnDel.textContent = 'Elimina';
                btnDel.addEventListener('click', () => deleteUser(u.id));

                tdActions.appendChild(btnRole);
                tdActions.appendChild(btnDel);

                tr.appendChild(tdId);
                tr.appendChild(tdUser);
                tr.appendChild(tdRole);
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            usersContainer.innerHTML = '';
            usersContainer.appendChild(table);
        }

        // --- 2. POPOLA TABELLA SESSIONI ---
        const sessionsRes = await fetch('/api/sessions/', { credentials: 'same-origin' });

        if (!sessionsRes.ok)
        {
            console.error('Admin: /api/sessions returned', sessionsRes.status);
            alert('Errore nel caricamento delle sessioni.');
            return;
        }

        const sessionsData = await sessionsRes.json();
        const sessionsContainer = document.getElementById('admin-sessions-container');

        if (sessionsData.success || Array.isArray(sessionsData))
        {
            const sessions = sessionsData.sessions || sessionsData;

            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th><th>Utente</th><th>Macchina</th><th>Inizio</th><th>Fine</th><th>Azioni</th>
                    </tr>
                </thead>
            `;
            const tbody = document.createElement('tbody');

            sessions.forEach(s => {
                const tr = document.createElement('tr');

                const tdId       = document.createElement('td');
                tdId.textContent = s.id;

                const tdUser      = document.createElement('td');
                // [SECURITY FIX] textContent for all server-supplied fields.
                tdUser.textContent = s.username || s.user_id;

                const tdMachine       = document.createElement('td');
                const strong          = document.createElement('strong');
                strong.textContent    = s.machine_name || s.machine_id;
                tdMachine.appendChild(strong);

                const tdStart      = document.createElement('td');
                tdStart.textContent = formatAdminDate(s.started_at);

                const tdEnd      = document.createElement('td');
                tdEnd.textContent = formatAdminDate(s.ended_at);

                const tdActions     = document.createElement('td');
                tdActions.className = 'action-btns';

                const btnEdit       = document.createElement('button');
                btnEdit.className   = 'btn-small bg-blue';
                btnEdit.textContent = 'Modifica';
                // [SECURITY FIX] Pass data as typed values through a closure, not
                // as strings interpolated into onclick="..." attributes. Attribute
                // interpolation requires manual escaping of quotes/angle-brackets
                // and is easy to get wrong, creating XSS opportunities.
                btnEdit.addEventListener('click', () =>
                    openEditSession(s.id, s.machine_name, s.started_at, s.ended_at)
                );

                const btnDel       = document.createElement('button');
                btnDel.className   = 'btn-small bg-red';
                btnDel.textContent = 'Elimina';
                btnDel.addEventListener('click', () => deleteSession(s.id));

                tdActions.appendChild(btnEdit);
                tdActions.appendChild(btnDel);

                tr.appendChild(tdId);
                tr.appendChild(tdUser);
                tr.appendChild(tdMachine);
                tr.appendChild(tdStart);
                tr.appendChild(tdEnd);
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            sessionsContainer.innerHTML = '';
            sessionsContainer.appendChild(table);
        }

        // --- 3. POPOLA TABELLA SEGNALAZIONI (NOTE) ---
        const notesRes = await fetch('/api/notes', { credentials: 'same-origin' });

        if (!notesRes.ok)
        {
            console.error('Admin: /api/notes returned', notesRes.status);
            alert('Errore nel caricamento delle segnalazioni.');
            return;
        }

        const notes = await notesRes.json();
        const notesContainer = document.getElementById('admin-notes-container');

        if (Array.isArray(notes))
        {
            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th><th>Utente</th><th>Macchina</th><th>Testo</th><th>Azioni</th>
                    </tr>
                </thead>
            `;
            const tbody = document.createElement('tbody');

            notes.forEach(n => {
                const tr = document.createElement('tr');

                const tdId       = document.createElement('td');
                tdId.textContent = n.id;

                const tdUser      = document.createElement('td');
                tdUser.textContent = n.username || n.user_id;

                const tdMachine       = document.createElement('td');
                const strong          = document.createElement('strong');
                strong.textContent    = n.name || n.machine_id;
                tdMachine.appendChild(strong);

                const tdContent      = document.createElement('td');
                // [SECURITY FIX] textContent prevents stored XSS: if an attacker
                // submitted a note containing <script>...</script> it would render
                // as literal text instead of executing in the admin's browser.
                tdContent.textContent = n.content;

                const tdActions     = document.createElement('td');
                tdActions.className = 'action-btns';

                const btnEdit       = document.createElement('button');
                btnEdit.className   = 'btn-small bg-blue';
                btnEdit.textContent = 'Modifica';
                // [SECURITY FIX] Note ID and content are passed through the closure,
                // not embedded in data-* attributes or onclick strings. The original
                // code used data-content with a manual .replace(/"/g, '&quot;') escape
                // that missed other dangerous characters (', `, <, >).
                btnEdit.addEventListener('click', () => openEditNote(n.id, n.content));

                const btnDel       = document.createElement('button');
                btnDel.className   = 'btn-small bg-red';
                btnDel.textContent = 'Elimina';
                btnDel.addEventListener('click', () => deleteNote(n.id));

                tdActions.appendChild(btnEdit);
                tdActions.appendChild(btnDel);

                tr.appendChild(tdId);
                tr.appendChild(tdUser);
                tr.appendChild(tdMachine);
                tr.appendChild(tdContent);
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            notesContainer.innerHTML = '';
            notesContainer.appendChild(table);
        }

    } catch (error) {
        console.error("Errore pannello Admin:", error);
    }
}

// ==========================================
// FUNZIONI CRUD PER GLI UTENTI
// ==========================================

export async function toggleUserRole(userId, currentRole)
{
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Vuoi davvero cambiare il ruolo in ${newRole.toUpperCase()}?`)) return;

    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            // [SECURITY FIX] credentials: 'same-origin' on all mutating requests
            // so the server can verify the admin session cookie.
            credentials: 'same-origin',
            body: JSON.stringify({ role: newRole })
        });

        if (res.ok)
        {
            loadAdminView();
        }
        else
        {
            alert("Errore durante l'aggiornamento del ruolo.");
        }
    } catch (e) {
        console.error("Errore modifica ruolo", e);
    }
}

export async function deleteUser(userId)
{
    if (!confirm("ATTENZIONE! Vuoi eliminare definitivamente questo utente?")) return;
    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            credentials: 'same-origin'  // [SECURITY FIX] Same as above.
        });
        if (res.ok)
        {
            loadAdminView();
        }
        else
        {
            alert("Errore durante l'eliminazione dell'utente.");
        }
    } catch (e) {
        console.error("Errore cancellazione utente", e);
    }
}

// [SECURITY FIX] openEditNote now accepts (id, content) directly from the
// closure instead of reading them from data-* attributes on the button element.
// This removes the need for any HTML-attribute escaping and keeps the note ID
// out of the DOM entirely, consistent with the _secureState pattern in script.js.
function openEditNote(noteId, content)
{
    // Store the ID in the module-level secure state imported from script.js
    // so the submit handler can attach it to the API call without a hidden input.
    import('./script.js').then(({ getSecureState }) => {
        getSecureState().editNoteId = noteId;
    });
    document.getElementById('edit-note-content').value = content;
    document.getElementById('modal-edit-note').classList.add('active');
}

function closeEditNote()
{
    document.getElementById('modal-edit-note').classList.remove('active');
}

// [SECURITY FIX] Expose only the functions that the HTML strictly needs.
// deleteSession and openEditSession are wired via addEventListener above and
// therefore do not need to be on window. Limiting window exposure reduces the
// attack surface for prototype-pollution and accidental global collisions.
window.toggleUserRole = toggleUserRole;
window.deleteUser     = deleteUser;
window.closeEditNote  = closeEditNote;
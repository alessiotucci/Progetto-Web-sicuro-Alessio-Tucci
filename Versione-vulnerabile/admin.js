/*
FILENAME: admin.js
Admin panel is empty
#view-admin only shows a placeholder message. You need:

A table/list of all users (with roles)

Current bookings / sessions

Ability to delete or modify machines (optional)

Action required:
Create admin.js with a function loadAdminView() that fetches from /api/admin/users and /api/admin/sessions and populates the view. Call it when navigating to /admin and only if logged user has role === 'admin'

*/

// Versione-vulnerabile/admin.js
// Versione-vulnerabile/admin.js

// Helper per formattare la data
function formatAdminDate(dateStr) {
    if (!dateStr) return "In corso";
    return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export async function loadAdminView() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Accesso negato. Effettua il login.");
        return;
    }

    const user = JSON.parse(userJson);
    if (user.role !== 'admin') {
        alert("Non hai i permessi di amministratore.");
        return;
    }

    try {
        // --- 1. POPOLA TABELLA UTENTI ---
        const usersRes = await fetch('/api/users'); // Assicurati che l'endpoint esista (GET)
        const usersData = await usersRes.json();
        const usersContainer = document.getElementById('admin-users-container');

        if (usersData.success || Array.isArray(usersData)) {
            const users = usersData.users || usersData;
            let html = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Username</th><th>Ruolo</th><th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            users.forEach(u => {
                const badgeColor = u.role === 'admin' ? 'bg-red' : 'bg-blue';
                html += `
                    <tr>
                        <td>${u.id}</td>
                        <td><strong>${u.username}</strong></td>
                        <td><span class="badge ${badgeColor}">${u.role.toUpperCase()}</span></td>
                        <td class="action-btns">
                            <button class="btn-small bg-orange" onclick="toggleUserRole(${u.id}, '${u.role}')">Cambia Ruolo</button>
                            <button class="btn-small bg-red" onclick="deleteUser(${u.id})">Elimina</button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            usersContainer.innerHTML = html;
        }

        // --- 2. POPOLA TABELLA SESSIONI ---
        const sessionsRes = await fetch('/api/sessions/');
        const sessionsData = await sessionsRes.json();
        const sessionsContainer = document.getElementById('admin-sessions-container');

        if (sessionsData.success || Array.isArray(sessionsData)) {
            const sessions = sessionsData.sessions || sessionsData;
            let html = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Utente</th><th>Macchina</th><th>Inizio</th><th>Fine</th><th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            sessions.forEach(s => {
                // Sfruttiamo le stesse funzioni del profilo per Modifica/Elimina
                html += `
                    <tr>
                        <td>${s.id}</td>
                        <td>${s.username || s.user_id}</td>
                        <td><strong>${s.machine_name || s.machine_id}</strong></td>
                        <td>${formatAdminDate(s.started_at)}</td>
                        <td>${formatAdminDate(s.ended_at)}</td>
                        <td class="action-btns">
                            <button class="btn-small bg-blue" onclick="openEditSession(${s.id}, '${s.machine_name}', '${s.started_at}', '${s.ended_at}')">Modifica</button>
                            <button class="btn-small bg-red" onclick="deleteSession(${s.id}, true)">Elimina</button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            sessionsContainer.innerHTML = html;
        }
    } catch (error) {
        console.error("Errore pannello Admin:", error);
        document.getElementById('admin-users-container').innerHTML = "<p>Errore di connessione.</p>";
    }
}

// ==========================================
// FUNZIONI CRUD PER GLI UTENTI
// ==========================================

export async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Vuoi davvero cambiare il ruolo in ${newRole.toUpperCase()}?`)) return;

    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        });

        if (res.ok) {
            loadAdminView(); // Ricarica la tabella
        } else {
            alert("Errore durante l'aggiornamento del ruolo.");
        }
    } catch (e) {
        console.error("Errore modifica ruolo", e);
    }
}

export async function deleteUser(userId) {
    if (!confirm("ATTENZIONE! Vuoi eliminare definitivamente questo utente?")) return;

    try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminView();
        } else {
            alert("Errore durante l'eliminazione dell'utente.");
        }
    } catch (e) {
        console.error("Errore cancellazione utente", e);
    }
}

// Esponiamo le funzioni all'HTML
window.toggleUserRole = toggleUserRole;
window.deleteUser = deleteUser;

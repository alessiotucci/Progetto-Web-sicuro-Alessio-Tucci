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

export async function loadAdminView() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Accesso negato. Devi fare il login.");
        return;
    }

    const user = JSON.parse(userJson);

    // Controllo lato client (Aggirabile facilmente, vulnerabilità mantenuta)
    if (user.role !== 'admin') {
        alert("Non hai i permessi di amministratore.");
        return;
    }

    try {
        // Fetch Utenti
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        const usersContainer = document.getElementById('admin-users-container');

        if (usersData.success || Array.isArray(usersData)) {
            const users = usersData.users || usersData;
            let html = '<table border="1"><tr><th>ID</th><th>Username</th><th>Ruolo</th></tr>';
            users.forEach(u => {
                html += `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.role}</td></tr>`;
            });
            html += '</table>';
            usersContainer.innerHTML = html;
        }

        // Fetch Sessioni
        const sessionsRes = await fetch('/api/sessions');
        const sessionsData = await sessionsRes.json();
        const sessionsContainer = document.getElementById('admin-sessions-container');

        if (sessionsData.success || Array.isArray(sessionsData)) {
            const sessions = sessionsData.sessions || sessionsData;
            let html = '<table border="1"><tr><th>ID Sessione</th><th>User ID</th><th>Macchina</th><th>Inizio</th><th>Fine</th></tr>';
            sessions.forEach(s => {
                html += `<tr><td>${s.id}</td><td>${s.user_id}</td><td>${s.machine_id}</td><td>${s.started_at}</td><td>${s.ended_at || 'In corso'}</td></tr>`;
            });
            html += '</table>';
            sessionsContainer.innerHTML = html;
        }
    } catch (error) {
        console.error("Errore pannello Admin:", error);
    }
}

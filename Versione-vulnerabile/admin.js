
// Helper per formattare la data
function formatAdminDate(dateStr)
{
	if (!dateStr)
		return "In corso";
	return new Date(dateStr).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

// Semplice controllo con local storage, non molto sicuro!
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
		// Cache-busting param
		const t = Date.now();

		// --- 1. POPOLA TABELLA UTENTI ---
		const usersRes = await fetch(`/api/users?t=${t}`); 
		const usersData = await usersRes.json();
		const usersContainer = document.getElementById('admin-users-container');

		if (usersData.success || Array.isArray(usersData))
		{
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
		const sessionsRes = await fetch(`/api/sessions/?t=${t}`);
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
				html += `
					<tr>
						<td>${s.id}</td>
						<td>${s.username || s.user_id}</td>
						<td><strong>${s.machine_name || s.machine_id}</strong></td>
						<td>${formatAdminDate(s.started_at)}</td>
						<td>${formatAdminDate(s.ended_at)}</td>
						<td class="action-btns">
							<button class="btn-small bg-blue" onclick="openEditSession(${s.id}, '${s.machine_name}', '${s.started_at}', '${s.ended_at}')">Modifica</button>
							<button class="btn-small bg-red" onclick="deleteSession(${s.id})">Elimina</button>
						</td>
					</tr>
				`;
			});
			html += '</tbody></table>';
			sessionsContainer.innerHTML = html;
		}

		// --- 3. POPOLA TABELLA SEGNALAZIONI (NOTE) ---
		const notesRes = await fetch(`/api/notes?t=${t}`);
		const notes = await notesRes.json();
		const notesContainer = document.getElementById('admin-notes-container');

		if (Array.isArray(notes)) {
			let html = `
				<table class="admin-table">
					<thead>
						<tr>
							<th>ID</th><th>Utente</th><th>Macchina</th><th>Testo</th><th>Azioni</th>
						</tr>
					</thead>
					<tbody>
			`;
			notes.forEach(n => {
				html += `
					<tr>
						<td>${n.id}</td>
						<td>${n.username || n.user_id}</td>
						<td><strong>${n.name || n.machine_id}</strong></td>
						<td>${n.content}</td>
						<td class="action-btns">
							<button class="btn-small bg-blue" data-id="${n.id}" data-content="${n.content.replace(/"/g, '&quot;')}" onclick="openEditNote(this)">Modifica</button>
							<button class="btn-small bg-red" onclick="deleteNote(${n.id})">Elimina</button>
						</td>
					</tr>
				`;
			});
			html += '</tbody></table>';
			notesContainer.innerHTML = html;
		}

	} catch (error) {
		console.error("Errore pannello Admin:", error);
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

		if (res.ok)
		{
			loadAdminView(); // Ricarica la tabella
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
		const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
		if (res.ok)
		{
			loadAdminView();
		}
		else
		{
			alert("Errore durante l'eliminazione dell'utente.");
		}
	}
	catch (e)
	{
		console.error("Errore cancellazione utente", e);
	}
}

// Esponiamo le funzioni all'HTML
window.toggleUserRole = toggleUserRole;
window.deleteUser = deleteUser;

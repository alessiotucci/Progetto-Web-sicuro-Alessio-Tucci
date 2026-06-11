// Versione-vulnerabile/profile.js

// Helper per formattare le date e renderle leggibili per gli utenti italiani
function formatDisplayDate(dateStr) {
    if (!dateStr) return "In corso...";
    const d = new Date(dateStr);
    return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export async function loadProfileView() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    try {
        // Fetch Prenotazioni
        const resSessions = await fetch('/api/sessions/');
        const sessions = await resSessions.json();

        // VULNERABILITÀ: L'attaccante vede il traffico di rete con tutti i dati (Insecure Direct Object Reference / Data Exposure).
        // FIX FUTURO: L'API dovrebbe restituire SOLO le prenotazioni dell'utente autenticato (es. /api/sessions/me).
        const mySessions = sessions.filter(s => s.username === user.username);
        const containerSessions = document.getElementById('my-sessions-container');

        if (mySessions.length === 0) {
            containerSessions.innerHTML = '<p style="text-align:center; width:100%; color: var(--color-text-muted);">Nessuna prenotazione attiva.</p>';
        } else {
            // Creazione dinamica delle Card con i pulsanti Modifica e Annulla
            containerSessions.innerHTML = mySessions.map(s => `
                <div class="card profile-card">
                    <h3>${s.machine_name}</h3>
                    <p><strong>Inizio:</strong> <br>${formatDisplayDate(s.started_at)}</p>
                    <p><strong>Fine:</strong> <br>${formatDisplayDate(s.ended_at)}</p>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditSession(${s.id}, '${s.machine_name}', '${s.started_at}', '${s.ended_at}')">Modifica</button>
                        <button class="btn-delete" onclick="deleteSession(${s.id})">Annulla</button>
                    </div>
                </div>
            `).join('');
        }

        // Fetch Segnalazioni
        // VULNERABILITÀ: Passaggio dell'ID utente in chiaro e recupero di tutte le note (potenziale Broken Access Control).
        // FIX FUTURO: L'API non dovrebbe richiedere user_id, ma ricavarlo dal token di sessione.
        const resNotes = await fetch(`/api/notes`); // Modificato per seguire l'anti-pattern: carichiamo tutto
        const notes = await resNotes.json();
        
        // Filtriamo lato client come richiesto dall'anti-pattern
        const myNotes = notes.filter(n => n.user_id === user.id);
        const containerNotes = document.getElementById('my-notes-container');
        
        if (myNotes.length === 0) {
            containerNotes.innerHTML = '<p style="text-align:center; width:100%; color: var(--color-text-muted);">Non hai segnalato alcun problema.</p>';
        } else {
            // Creazione dinamica delle Card per le note
            // VULNERABILITÀ: Stored XSS - il contenuto della nota (n.content) viene inserito direttamente nel DOM senza sanitizzazione.
            // FIX FUTURO: Usare textContent o una libreria di sanitizzazione come DOMPurify.
            containerNotes.innerHTML = myNotes.map(n => `
                <div class="card profile-card" style="border-top-color: var(--color-danger)">
                    <h3>Macchina ID: ${n.machine_id}</h3>
                    <p><strong>Segnalazione:</strong> ${n.content}</p>
                </div>
            `).join('');
        }

    } catch (e) {
        console.error("Errore caricamento profilo", e);
    }
}

// ==========================================
// FUNZIONI CRUD
// ==========================================

export async function deleteSession(sessionId) {
    // Conferma nativa del browser per evitare cancellazioni accidentali
    if (!confirm("Sei sicuro di voler cancellare questa prenotazione?")) return;

    try {
        const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
        if (res.ok) {
            loadProfileView(); // Ricarica le card aggiornate
        } else {
            alert("Errore durante la cancellazione.");
        }
    } catch (e) {
        console.error("Errore DELETE", e);
    }
}

export function openEditSession(sessionId, machineName, startedAt, endedAt) {
    document.getElementById('edit-session-id').value = sessionId;
    document.getElementById('edit-started-at').value = startedAt; 
    document.getElementById('edit-machine-name').textContent = machineName;

    // Converte la data dal DB in un formato accettato dall'input datetime-local (YYYY-MM-DDThh:mm)
    if (endedAt && endedAt !== 'null') {
        const d = new Date(endedAt);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);
        document.getElementById('edit-ended-at').value = localISOTime;
    }

    document.getElementById('modal-edit-session').classList.add('active');
}

export function closeEditSession() {
    document.getElementById('modal-edit-session').classList.remove('active');
}

export async function handleEditSession(e) {
    e.preventDefault();
    const sessionId = document.getElementById('edit-session-id').value;
    const startedAt = document.getElementById('edit-started-at').value;
    const endedAt = document.getElementById('edit-ended-at').value;

    try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ started_at: startedAt, ended_at: endedAt })
        });

        if (res.ok) {
            closeEditSession();
            loadProfileView();
        } else {
            alert("Errore durante l'aggiornamento.");
        }
    } catch (error) {
        console.error("Errore PUT", error);
    }
}

// Esponiamo le funzioni all'HTML per i pulsanti inline
window.deleteSession = deleteSession;
window.openEditSession = openEditSession;
window.closeEditSession = closeEditSession;
// Versione-vulnerabile/profile.js
export async function loadProfileView() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    try
	{
        const res = await fetch('/api/sessions/');
        const sessions = await res.json();
        
        // VULNERABILITÀ: Filtriamo i dati lato client. 
        // L'attaccante può rimuovere questo filtro e vedere le sessioni di chiunque.
        const mySessions = sessions.filter(s => s.username === user.username);
        
        const container = document.getElementById('my-sessions-container');
        container.innerHTML = mySessions.map(s => `
            <div>Macchina: ${s.machine_name} | Inizio: ${s.started_at}</div>
        `).join('');
    }
	catch (e)
	{
        console.error("Errore caricamento profilo", e);
    }
}

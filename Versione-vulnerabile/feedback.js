// feedback.js
//1)
export function openFeedback(machineId)
{
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert("Devi effettuare il login per segnalare un problema.");
        return;
    }

    const card = document.getElementById(`mach-${machineId}`);
    if (card) {
        const machineName = card.querySelector('h3')?.textContent || machineId.toUpperCase();
        document.getElementById('modal-feedback-machine-name').textContent = machineName;
    }

    document.getElementById('modal-feedback-machine-id').value = machineId;
    document.getElementById('modal-feedback').classList.add('active');
    document.body.style.overflow = 'hidden';
}
//2)
export function closeFeedback()
{
    document.getElementById('modal-feedback').classList.remove('active');
    document.getElementById('form-feedback').reset();
    document.body.style.overflow = '';
}

//3)
export function initFeedbackForm()
{
    document.getElementById('btn-close-feedback').addEventListener('click', closeFeedback);

    document.getElementById('form-feedback').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userJson = localStorage.getItem('user');
        if (!userJson) return;
        const user = JSON.parse(userJson);
        
        const formData = new FormData(e.target);
        const body = {
            machine_id: formData.get('machine_id'),
            user_id: user.id,
            content: formData.get('content')
        };

        try {
            const res = await fetch('/api/notes', { // Modifica il path se la tua API è diversa
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await res.json();

            if (res.ok) {
                closeFeedback();
                alert("Segnalazione inviata con successo.");
            } else {
                alert(`Errore: ${result.error || 'Impossibile inviare la segnalazione'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Errore di rete.");
        }
    });
}

// load feedback
export async function loadFeedback() {
    try {
        const res = await fetch('/api/notes'); 
        
        // Se l'API non esiste o dà errore, esci silenziosamente
        if (!res.ok) throw new Error("Errore nel fetch delle note pubbliche");
        
        const notes = await res.json();
        const container = document.getElementById('segnalazioni-container');

        if (!container) return;

        if (notes.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">Nessuna segnalazione al momento.</p>';
            return;
        }

        // VULNERABILITÀ: Stored XSS attivo per l'esame.
        // Il campo note.content viene stampato in pagina senza textContent o escape HTML.
        container.innerHTML = notes.map(note => `
            <div style="background-color: var(--color-surface); padding: var(--space-sm) var(--space-md); border-radius: var(--radius-sm); border-left: 3px solid var(--color-danger); margin-bottom: var(--space-sm); box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <span style="font-size: 0.7rem; font-weight: bold; color: var(--color-text-muted);">Macchina ID: ${note.machine_id}</span>
                <p style="margin-top: 4px; font-size: 0.9rem;">${note.content}</p>
            </div>
        `).join('');

    } catch (err) {
        console.error("Errore caricamento bacheca segnalazioni:", err);
    }
}
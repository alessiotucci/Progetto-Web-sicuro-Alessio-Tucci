/*
FILENAME: feedback.js
Action required:
Create a module feedback.js with functions:

loadFeedback() → fetch from /api/notes and render inside #segnalazioni-container (using innerHTML to deliberately allow XSS, if that’s the requirement).

submitFeedback(text) → POST to backend.

Register submit handler for #form-segnalazione.
*/
// Versione-vulnerabile/feedback.js
import { registerFormHandler } from './auth.js';

export async function loadFeedback() {
    try {
        const response = await fetch('/api/notes');
        const result = await response.json();
        const container = document.getElementById('segnalazioni-container');

        if (result.success || Array.isArray(result)) {
            const notes = result.notes || result;
            let html = '<ul>';
            notes.forEach(note => {
                // VULNERABILITÀ: XSS (Cross-Site Scripting)
                // Inseriamo il contenuto grezzo senza sanitizzazione.
                // Se un utente invia "<script>alert(1)</script>", il browser lo eseguirà.
                html += `<li><strong>User ${note.user_id} (Macchina: ${note.machine_id}):</strong> ${note.content}</li>`;
            });
            html += '</ul>';
            container.innerHTML = html;
        } else {
            container.innerHTML = "Nessuna segnalazione presente.";
        }
    } catch (error) {
        console.error("Errore fetch note:", error);
    }
}

export function initFeedbackForm() {
    registerFormHandler('form-segnalazione', '/api/notes', (result) => {
        if (result.success || result.id) {
            alert("Segnalazione inviata!");
            document.getElementById('form-segnalazione').reset();
            loadFeedback(); // Ricarica la lista per mostrare la nuova nota (ed eseguire eventuali script)
        } else {
            alert(`Errore: ${result.message || result.error}`);
        }
    });
}

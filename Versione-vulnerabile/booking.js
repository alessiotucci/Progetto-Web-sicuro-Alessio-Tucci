import { loadDashboardView } from './dashboard.js';
import { registerFormHandler } from './auth.js';

export function openBooking(machineId) {
    const userJson = localStorage.getItem('user');
    if (!userJson) { alert("Login richiesto."); return; }
    
    const user = JSON.parse(userJson);
    
    // UI: Mostra il modal
    document.getElementById('modal-booking').style.display = 'block';
    document.getElementById('modal-machine-name').textContent = machineId.toUpperCase();
    document.getElementById('modal-machine-id').value = machineId;
    document.getElementById('modal-user-id').value = user.id;
}

export function closeBooking() {
    document.getElementById('modal-booking').style.display = 'none';
    document.getElementById('form-booking').reset();
}

export function initBookingForm() {
    registerFormHandler('form-booking', '/api/sessions/', (result) => {
        // Se il server risponde correttamente (201 o 200)
        if (result.message) {
            alert("Prenotazione effettuata con successo!");
            closeBooking();
            // FORZA l'aggiornamento della Dashboard
            loadDashboardView(); 
        } else {
            alert("Errore: " + (result.error || "Prenotazione fallita"));
        }
    });
}


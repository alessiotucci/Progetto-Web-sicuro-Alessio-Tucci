import { loadDashboardView } from './dashboard.js';
import { registerFormHandler } from './auth.js';

//1
export function openBooking(machineId)
{
    // Controllo login e blocco immediato se l'utente non è autenticato
    const userJson = localStorage.getItem('user');
    if (!userJson)
	{
        alert("Devi effettuare il login per prenotare.");
        return;
    }
    
    const user = JSON.parse(userJson);
    // Mostra il form e compila i campi nascosti
    document.getElementById('modal-booking').style.display = 'block';
    document.getElementById('modal-machine-name').textContent = machineId.toUpperCase();
    document.getElementById('modal-machine-id').value = machineId;
    // Inietta l'ID utente nel form. È qui che risiede la vulnerabilità:
    // un utente può modificare l'HTML nel browser e cambiare questo ID prima di fare submit.
    document.getElementById('modal-user-id').value = user.id; 
}

//2
export function closeBooking()
{
    document.getElementById('modal-booking').style.display = 'none';
    document.getElementById('form-booking').reset();
}

//3
export function initBookingForm()
{
    // Sfrutta la tua funzione custom per fare il POST e gestire la risposta
    registerFormHandler('form-booking', '/api/sessions', (result) => {
        if (result.success)
		{
            alert("Prenotazione confermata!");
            closeBooking();
            loadDashboardView(); // Ricarica le card per mostrare lo stato "Occupata"
        }
		else
		{
            alert(`Errore: ${result.message || result.error}`);
        }
    });
}

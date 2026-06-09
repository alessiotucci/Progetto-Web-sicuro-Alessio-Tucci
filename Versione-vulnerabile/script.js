import { registerFormHandler } from './auth.js';
import { updateNavbar } from './navbar.js';
import { loadDashboardView } from './dashboard.js';
import { initBookingForm, openBooking, closeBooking } from './booking.js';
import { loadAdminView } from './admin.js';
import { loadFeedback, initFeedbackForm } from './feedback.js';

const routes = {
    '/': 'view-home',
    '/login': 'view-login',
    '/signup': 'view-signup',
    '/dashboard': 'view-dashboard',
    '/admin': 'view-admin'
};

function router() {
    const path = window.location.pathname;
    const idActiveView = routes[path] || 'view-home';

    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const viewToShow = document.getElementById(idActiveView);
    if (viewToShow) {
        viewToShow.classList.add('active');
    }

    // Esegui fetch specifiche in base alla vista caricata
    if (path === '/dashboard') {
        loadDashboardView();
        loadFeedback();
    } else if (path === '/admin') {
        loadAdminView();
    }
}

function my_navigateTo(url)
{
    history.pushState(null, null, url);
    router();
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inizializza i form (Booking e Feedback)
    initBookingForm();
    initFeedbackForm();

    // 2. Event Delegation globale per la Navbar (Link e Logout)
    document.body.addEventListener('click', e => {
        if (e.target.matches('.nav-link')) {
            e.preventDefault();
            if (e.target.classList.contains('logout-action')) {
                localStorage.removeItem('user');
                updateNavbar();
                my_navigateTo('/');
            } else {
                my_navigateTo(e.target.getAttribute('href'));
            }
        }
    });

    // 3. Event Delegation per la Dashboard (Bottoni Book e chiusura Modale)
    document.getElementById('view-dashboard').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-book');
        if (btn && !btn.disabled) {
            const machineId = btn.closest('.card').id.replace('mach-', '');
            openBooking(machineId);
        }
    });
    
    document.querySelector('#modal-booking button[type="button"]').addEventListener('click', closeBooking);

    // 4. Inizializzazione Router e Auth Forms
    window.addEventListener('popstate', router);
    router();
    updateNavbar();

    registerFormHandler('form-login', '/api/auth/login', (result) => {
	//TODO: login part
	const errorContainer = document.getElementById('login-error');
	if (errorContainer)
		errorContainer.textContent = '';
	if (result.success)
	{
		localStorage.setItem('user', JSON.stringify(result.user));
		updateNavbar();
		my_navigateTo('/dashboard');
	}
	else
	{
		if (errorcontainer)
			errorContainer.textContent = result.message || result.error || "Invalid username or password";
	}
    });

    registerFormHandler('form-signup', '/api/users', (result) => {
        if (result.success || result.user) {
            // Adatta il risultato in base a cosa restituisce esattamente il tuo backend
            const user = result.user || { username: 'Nuovo Utente' }; 
            localStorage.setItem('user', JSON.stringify(user));
            updateNavbar();
            my_navigateTo('/dashboard');
        } else {
            alert(`Errore Registrazione: ${result.message || result.error}`);
        }
    });
});

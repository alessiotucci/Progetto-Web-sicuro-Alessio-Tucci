import { registerFormHandler } from './auth.js';
import { updateNavbar } from './navbar.js';
import { loadDashboardView, startDashboardPolling, stopDashboardPolling } from './dashboard.js';
import { initBookingForm, openBooking, closeBooking } from './booking.js';
import { loadAdminView, toggleUserRole, deleteUser } from './admin.js';
import { loadProfileView, handleEditSession } from './profile.js';
import { loadFeedback, initFeedbackForm, openFeedback } from './feedback.js';

const routes = {
    '/': 'view-home',
    '/login': 'view-login',
    '/signup': 'view-signup',
    '/dashboard': 'view-dashboard',
	'/profile': 'view-profile', // new shit
    '/admin': 'view-admin'
};

//1) first function, the router function
function router()
{
    const path = window.location.pathname;
    const idActiveView = routes[path] || 'view-home';

    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const viewToShow = document.getElementById(idActiveView);
    if (viewToShow)
	{
        viewToShow.classList.add('active');
    }
	
	/* Navbar nice :) */
	document.querySelectorAll('.nav-link').forEach(link => {
		if (link.getAttribute('href') === path)
		{
			link.classList.add('active');
		}
		else
		{
			link.classList.remove('active');
		}
	});

    // Esegui fetch specifiche in base alla vista caricata
    if (path === '/dashboard')
	{
//        loadDashboardView();
		startDashboardPolling();
        loadFeedback();
    }
	else if (path === '/admin')
	{
		stopDashboardPolling();
        loadAdminView();
    }
	else if (path === '/profile')
	{
		stopDashboardPolling();
		loadProfileView();
	}
	else
	{
		stopDashboardPolling();
	}
}

//2) custom function to navigate to a URL
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
		// Gestione Segnalazione
		const btnReport = e.target.closest('.btn-report');
		if (btnReport) {
			const machineId = btnReport.closest('.card').id.replace('mach-', '');
			openFeedback(machineId);
		}
    });
    
    document.querySelector('#modal-booking button[type="button"]').addEventListener('click', closeBooking);

    // 4. Inizializzazione Router e Auth Forms
    window.addEventListener('popstate', router);
    router();
    updateNavbar();

	// ?. Inizializza l'orologio prima di tutto!
    const clockDisplay = document.getElementById('clock-display');
    if (clockDisplay) {
        setInterval(() => {
            const now = new Date();
            // Format to HH:MM:SS
            clockDisplay.textContent = now.toLocaleTimeString('it-IT');
        }, 1000);
    }

	// 5. Provo a piazzarlo qui ...
	const formEditSession = document.getElementById('form-edit-session');
	if (formEditSession)
	{
    	formEditSession.addEventListener('submit', handleEditSession);
	}

    registerFormHandler('form-login', '/api/auth/login', (result) => {
	//TODO: login part
	console.log("DEBUG: try to understand!!");
	const errorContainer = document.getElementById('login-error');
	if (errorContainer)
		errorContainer.textContent = '';
	if (result.success)
	{
		localStorage.setItem('user', JSON.stringify(result.user));
		updateNavbar();
		my_navigateTo('/profile');
	}
	else
	{
		//alert("wrong credentials!! :(");
		if (errorContainer)
			errorContainer.textContent = result.message || result.error || "Invalid username or password";
	}
    });

	/* fix the bug for the signup handling */
    registerFormHandler('form-signup', '/api/users', (result) => {
        if (result.message === 'User created' || result.id)
		{
            // Adatta il risultato in base a cosa restituisce esattamente il tuo backend
            const user = result.user || { username: 'Nuovo Utente' }; 
            localStorage.setItem('user', JSON.stringify(user));
            updateNavbar();
			alert("Account created, now you can login in");
			document.getElementById("form-login").reset();
			goofy_animation();
            my_navigateTo('/login');
        }
		else
		{
            alert(`Errore Registrazione: ${result.message || result.error}`);
        }
    });
});


function goofy_animation() {
    const style = document.createElement('style');
    style.innerHTML = `
        .laundry-toast {
            position: fixed;
            bottom: var(--space-xl);
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background-color: var(--color-success-light);
            color: var(--color-success);
            border: 2px solid var(--color-success);
            border-radius: var(--radius-lg);
            padding: var(--space-md) var(--space-lg);
            font-size: 1.1rem;
            font-weight: 700;
            box-shadow: 0 10px 25px rgba(22, 163, 74, 0.2);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 12px;
            opacity: 0;
            /* Effetto rimbalzo fluido */
            animation: laundrySlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        @keyframes laundrySlideUp {
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);

    const toast = document.createElement('div');
    toast.className = 'laundry-toast';
    // L'icona a bolle richiama il tema della lavanderia
    toast.innerHTML = '<span style="font-size: 1.5rem;">🫧</span> Account creato!';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => { toast.remove(); style.remove(); }, 300);
    }, 2500);
}

console.log("Script for the vulnerable version!");

import { registerFormHandler } from './auth.js';
import { updateNavbar } from './navbar.js';

// Dictionary in Javascript, usefull to create my routes
const routes = {
    '/': 'view-home',
    '/login': 'view-login',
    '/signup': 'view-signup',
    '/dashboard': 'view-dashboard',
    '/admin': 'view-admin'
};

// Router function, check for the path, hide the other div (using remove).
// Add the class active only tho the Active view!
function router()
{
    const path = window.location.pathname;
    const idActiveView = routes[path] || 'view-home'; // fallback to view the home page

    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    const viewToShow = document.getElementById(idActiveView);
    if (viewToShow)
	{
        viewToShow.classList.add('active');
    }
}

// Funzione per cambiare rotta via codice
function my_navigateTo(url)
{
    history.pushState(null, null, url);
    router();
}

// Inizializzazione degli eventi al caricamento del DOM

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', e => {
        if (e.target.matches('.nav-link'))
		{
            e.preventDefault(); // Previene il reload della pagina
            my_navigateTo(e.target.getAttribute('href'));
        }
    });

    window.addEventListener('popstate', router);
    router();
	updateNavbar();

	// Gestione del Submit del Form di Login utilizzando la funzione importata da auth.js
    registerFormHandler('form-login', '/api/login', (result) => {
        if (result.success) {
            alert(`Login riuscito! Ruolo: ${result.user.role}`);
            localStorage.setItem('user', JSON.stringify(result.user));
			updateNavbar();
            my_navigateTo('/dashboard');
        }
		else
		{
            alert(`Errore Login: ${result.message || result.error}`);
        }
    });
});

// Gestione dei click sui link della navbar in script.js
document.body.addEventListener('click', e => {
    if (e.target.matches('.nav-link')) {
        
        // Intercetta l'azione di logout tramite la classe dedicata
        if (e.target.classList.contains('logout-action')) {
            e.preventDefault();
            
            localStorage.removeItem('user'); // Cancella l'oggetto utente dal browser
            updateNavbar();                  // Ripristina i link originali della navbar
            my_navigateTo('/');                 // Reindirizza alla home
            return;
        }

        // Gestione standard del routing per gli altri link
        e.preventDefault();
        navigateTo(e.target.getAttribute('href'));
    }
});
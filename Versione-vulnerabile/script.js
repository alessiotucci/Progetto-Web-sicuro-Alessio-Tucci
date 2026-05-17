console.log("Script for the vulnerable version!");

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
});
// Versione-vulnerabile/navbar.js
export function updateNavbar()
{
    const userJson = localStorage.getItem('user');
    const authLink = document.getElementById('nav-auth');
    const profileLink = document.getElementById('nav-profile');
    const adminLink = document.getElementById('nav-admin');


    if (userJson)
	{
        // UTENTE LOGGATO
        const user = JSON.parse(userJson);

        authLink.textContent = 'Logout';
		authLink.setAttribute('href', '#');
		authLink.classList.add('logout-action');

        profileLink.textContent = `Profilo (${user.username})`;
        profileLink.setAttribute('href', '/profile');

        // Mostra il pannello admin solo se l'utente ha il ruolo corretto
        if (user.role === 'admin' && adminLink)
		{
            adminLink.style.display = 'inline';
        }
		else if (adminLink)
		{
            adminLink.style.display = 'none';
        }
    }
	else
	{
        // UTENTE NON LOGGATO (Stato iniziale)
        authLink.textContent = 'Login';
        authLink.setAttribute('href', '/login');
		authLink.classList.remove('logout-action'); // Rimuove il marcatore
		
        profileLink.textContent = 'Sign Up';
        profileLink.setAttribute('href', '/signup');

        if (adminLink)
		{
            adminLink.style.display = 'none';
        }
    }
}
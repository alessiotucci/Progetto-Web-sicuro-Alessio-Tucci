// Secure version of navbar.js
// versione-sicura/navbar.js
import { getSecureState } from './script.js';

export function updateNavbar()
{
    // [SECURITY FIX] Wrapped localStorage read in try/catch — malformed data
    // would otherwise throw an uncaught exception and leave the navbar broken.
    let user = null;
    try {
        const userJson = localStorage.getItem('user');
        if (userJson) user = JSON.parse(userJson);
    } catch {
        localStorage.removeItem('user');
    }

    const homeLink    = document.querySelector('a[href="/"]');
    const authLink    = document.getElementById('nav-auth');
    const profileLink = document.getElementById('nav-profile');

    // [SECURITY FIX] The admin link is never looked up here — it is injected and
    // removed exclusively by _injectAdminLinkIfAdmin() in script.js, which runs
    // after the server confirms the role. Touching it in updateNavbar() as well
    // would create two competing code paths and risk re-showing the link via a
    // race condition. navbar.js has no responsibility for access-controlled links.

    if (user)
    {
        // [SECURITY FIX] Removed debug console.log that printed internal nav state
        // on every navbar update, visible to any user with DevTools open.

        if (homeLink)
			homeLink.style.display = 'none';

        authLink.textContent = 'Logout';
        authLink.setAttribute('href', '#');
        authLink.classList.add('logout-action');

        // [SECURITY FIX] Use textContent to write the username into the nav link.
        // The original code used template-literal assignment to .textContent which
        // is safe on its own, but being explicit here guards against any future
        // refactor that might switch to innerHTML — a username like
        // <script>...</script> would execute if that happened.
        profileLink.textContent = `Profilo (${user.username})`;
        profileLink.setAttribute('href', '/profile');
    }
    else
    {
        // Logged-out state
        if (homeLink)
			homeLink.style.display = 'inline-flex';

        authLink.textContent = 'Login';
        authLink.setAttribute('href', '/login');
        authLink.classList.remove('logout-action');

        profileLink.textContent = 'Sign Up';
        profileLink.setAttribute('href', '/signup');

        // [SECURITY FIX] On logout, explicitly remove the admin link from the DOM
        // rather than relying on display:none. A hidden element is still present
        // in the source and can be re-enabled via DevTools. Removal is consistent
        // with the _injectAdminLinkIfAdmin() pattern in script.js.
        const adminLink = document.getElementById('nav-admin');
        if (adminLink)
			adminLink.remove();
    }
}

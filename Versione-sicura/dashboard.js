// Secure version of dashboard.js

// =============================================================================
// DASHBOARD
// =============================================================================
export function getAuthHeaders()
{
    try
	{
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.id) return {};
        return {
            'X-User-Id': user.id.toString()
        };
    }
	catch
	{
        return {};
    }
}
export async function loadDashboardView()
{
    try {
        // [SECURITY FIX] Added credentials: 'same-origin' to both requests so
        // the session cookie is sent and the server can enforce authentication.
        // Without this, the endpoints would be effectively public to any script
        // that can reach the server.

		// [OTHER FIX]
		const headers = getAuthHeaders();

		const [machinesRes, sessionsRes] = await Promise.all([
			fetch('/api/machines/', {
				credentials: 'same-origin',
				headers
			}),
			fetch('/api/sessions/', {
				credentials: 'same-origin',
				headers
			})
		]);

        // [SECURITY FIX] Check HTTP status before parsing. A 401/403 from the
        // server would otherwise be silently swallowed and the dashboard would
        // render with empty or stale data, giving no indication to the user that
        // their session has expired.
        if (!machinesRes.ok || !sessionsRes.ok)
        {
            console.error('Dashboard: unexpected response', machinesRes.status, sessionsRes.status);
            return;
        }

        const machines = await machinesRes.json();
        const sessions = await sessionsRes.json();

        // [SECURITY FIX] Validate that the responses are arrays before calling
        // .map() / .find() on them. If the server returns an error object instead
        // of an array, iterating over it would throw and leave the dashboard broken.
        if (!Array.isArray(machines) || !Array.isArray(sessions))
        {
            console.error('Dashboard: unexpected payload shape');
            return;
        }

        const now = new Date();

        const enriched = machines.map(machine => {
            const activeSession = sessions.find(s => {
                const start = new Date(s.started_at);
                const end   = new Date(s.ended_at);
                return s.machine_name === machine.name && now >= start && now <= end;
            });

            return {
                ...machine,
                status: activeSession ? 'In Use' : 'Available',
                usedBy: activeSession ? activeSession.username : null,
                until:  activeSession ? activeSession.ended_at  : null
            };
        });

        enriched.forEach(machine => {
            const card = document.getElementById(`mach-${machine.id}`);
            if (!card) return;

            const statusText = card.querySelector('.status-text');
            const bookBtn    = card.querySelector('.btn-book');

            if (machine.status === 'In Use')
            {
                // [SECURITY FIX] Use textContent instead of setting .textContent
                // with a template literal that embeds server-supplied strings
                // (username, ended_at). Both values come from the API and could
                // contain HTML if an attacker registered a malicious username.
                // textContent ensures they are always treated as plain text and
                // never parsed as markup, preventing stored XSS in the dashboard.
                statusText.textContent = `In Use by ${machine.usedBy} until ${machine.until}`;

                // [SECURITY FIX] Apply status styling via CSS classes instead of
                // inline style manipulation. Inline styles set via JS can be
                // overridden unexpectedly and bypass CSP style-src directives.
                // The .in-use and .available classes are defined in styles.css.
                statusText.className = 'status-text in-use';
                bookBtn.disabled = true;
            }
            else
            {
                statusText.textContent = 'Available';
                statusText.className   = 'status-text available';
                bookBtn.disabled = false;
            }
        });

    } catch (e) {
        // [SECURITY FIX] Do not log the raw error object — it can expose internal
        // endpoint paths or response details in the console.
        console.error('Dashboard: failed to load');
    }
}

// =============================================================================
// POLLING
// =============================================================================

let pollingInterval = null;

export function startDashboardPolling()
{
    // [SECURITY FIX] Clear any existing interval before starting a new one.
    // Without this, calling startDashboardPolling() more than once (e.g. by
    // navigating away and back) silently leaks intervals, causing loadDashboardView
    // to fire multiple times per tick and flooding the server with redundant requests.
    stopDashboardPolling();
    loadDashboardView();
    pollingInterval = setInterval(loadDashboardView, 30000);
}

export function stopDashboardPolling()
{
    clearInterval(pollingInterval);
    pollingInterval = null;
}
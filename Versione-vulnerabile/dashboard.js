// new dashboard function
export async function loadDashboardView() {
    try {
        // Step 1: fetch both in parallel
        const [machinesRes, sessionsRes] = await Promise.all([
            fetch('/api/machines/'),
            fetch('/api/sessions/')
        ]);
        const machines = await machinesRes.json();
        const sessions = await sessionsRes.json();

        const now = new Date();

        // Step 2: compute real status for each machine
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

        // Step 3: update the cards
        enriched.forEach(machine => {
            const card = document.getElementById(`mach-${machine.id}`);
            if (!card) return;

            const statusText = card.querySelector('.status-text');
            const bookBtn    = card.querySelector('.btn-book');

            if (machine.status === 'In Use') {
                statusText.textContent = `In Use by ${machine.usedBy} until ${machine.until}`;
                statusText.style.color = 'red';
                bookBtn.disabled = true;
            } else {
                statusText.textContent = 'Available';
                statusText.style.color = 'green';
                bookBtn.disabled = false;
            }
        });

    } catch (e) {
        console.error("Error loading dashboard", e);
    }
}

// Step 4: real-time polling
let pollingInterval = null;

export function startDashboardPolling() {
    loadDashboardView(); // immediate first load
    pollingInterval = setInterval(loadDashboardView, 30000);
}

export function stopDashboardPolling() {
    clearInterval(pollingInterval);
}

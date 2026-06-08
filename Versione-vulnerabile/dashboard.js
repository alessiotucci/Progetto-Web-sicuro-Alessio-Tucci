export async function loadDashboardView()
{
	try
	{
		// 1. Chiama l'API
		const response = await fetch('/api/machines/');
		const machines = await response.json();
		// 2. Itera sui risultati e aggiorna l'HTML
		machines.forEach(machine => {
			const card = document.getElementById(`mach-${machine.id}`);
			if (!card) return; // Salta se la card non esiste nell'HTML

			const statusSpan = card.querySelector('.status-text');
			const button = card.querySelector('.btn-book');

			// Aggiorna il testo dello stato
			statusSpan.textContent = machine.status;

			// Logica visiva in base allo stato
			if (machine.status.toLowerCase() !== 'available')
			{
				statusSpan.style.color = 'red';
				button.textContent = 'Occupata';
				button.disabled = true;
			}
			else
			{
				statusSpan.style.color = 'green';
				button.textContent = 'Book';
				button.disabled = false;
			}
		});
	}
	catch (error)
	{
		console.error("Errore nel caricamento delle macchine:", error);
	}
}

// Versione-vulnerabile/auth.js

/* Export the function ! */
/* Very useful function, it create a package and then send a POST request */
export function registerFormHandler(formId, endpoint, callback)
{
    const form = document.getElementById(formId);
    if (!form)
		return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
		console.log("DEBUG di atucci: FUNCTION FOR POST");
        try
		{
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            callback(result);
            
        }
		catch (error)
		{
            console.error(`Errore sulla rotta ${endpoint}:`, error);
        }
    });
}

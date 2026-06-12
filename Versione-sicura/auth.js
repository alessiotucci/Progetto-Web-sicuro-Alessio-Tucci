// Secure version of auth.js
// Versione-sicura/auth.js



export function registerFormHandler(formId, endpoint, callback)
{
    const form = document.getElementById(formId);
    if (!form)
        return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        // [SECURITY FIX] Removed console.log debug statement. Debug logs can
        // leak sensitive data (credentials, tokens) to anyone with DevTools open,
        // including on shared or public machines.

        try
        {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // [SECURITY FIX] Added credentials: 'same-origin' so the session
                // cookie is included in every POST request. Without this, the server
                // cannot tie the request to an authenticated session, which matters
                // for endpoints like /api/auth/login that set or read session state.
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });

            // [SECURITY FIX] Check HTTP status before parsing the body. The original
            // code passed every response to the callback regardless of status code,
            // meaning a 401, 403, or 500 from the server would be silently handled
            // as if it were a normal result. The callback now only receives the parsed
            // body on success; on failure a generic error is surfaced so the caller
            // does not accidentally treat an error response as a valid login/signup.
            if (!response.ok)
            {
                console.error(`${endpoint} returned ${response.status}`);
                callback({ success: false, message: 'Request failed. Please try again.' });
                return;
            }

            const result = await response.json();
            callback(result);
        }
        catch (error)
        {
            // [SECURITY FIX] Do not log the raw error object to the console in
            // production — it can expose internal endpoint paths, server stack
            // traces (if the response was not JSON), or network details.
            // A descriptive key is logged instead; the full error stays silent.
            console.error(`Network or parse error on ${endpoint}`);
            callback({ success: false, message: 'A network error occurred. Please try again.' });
        }
    });
}
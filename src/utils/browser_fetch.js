import fetch from 'node-fetch';
import 'dotenv/config';

const AHLAN_BROWSER_PORT = process.env.AHLAN_BROWSER_PORT || 5002;
const AHLAN_BROWSER_HOST = process.env.AHLAN_BROWSER_HOST || 'localhost';
const BROWSER_SERVICE_URL = `http://${AHLAN_BROWSER_HOST}:${AHLAN_BROWSER_PORT}/fetch`;

export async function browserFetch(url, options = {}) {
  const { method, headers, body } = options;

  try {
    const response = await fetch(BROWSER_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        method,
        headers,
        body: typeof body === 'string' ? JSON.parse(body) : body
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browser service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Mock a fetch-like response object
    return {
      status: result.status,
      statusText: result.statusText,
      ok: result.status >= 200 && result.status < 300,
      headers: {
        get: (name) => result.headers[name.toLowerCase()]
      },
      json: async () => result.data,
      text: async () => typeof result.data === 'object' ? JSON.stringify(result.data) : result.data
    };
  } catch (error) {
    console.error('Error in browserFetch:', error.message);
    throw error;
  }
}

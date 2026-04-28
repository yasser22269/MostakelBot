import fs from 'fs/promises';

const keys = [
    '6LcvYHooAAAAAC-G46bpymJKtIwfDQpg9DsHPMpL',
    '6Lf7x-8qAAAAACTG6gffMEWoXQoQhKS6UWTkG9cD'
];

async function fetchRecaptcha(key) {
    const url = `https://www.google.com/recaptcha/api.js?render=${key}`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const content = await response.text();
    const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : response.headers.get('set-cookie');

    const prefix = key.substring(0, 4);
    await fs.writeFile(`recaptcha_${prefix}.js`, content);
    await fs.writeFile(`cookies_${prefix}.json`, JSON.stringify(cookies, null, 2));

    console.log(`Saved recaptcha_${prefix}.js and cookies_${prefix}.json`);
}

async function run() {
    for (const key of keys) {
        try {
            await fetchRecaptcha(key);
        } catch (error) {
            console.error(`Error fetching key ${key}:`, error.message);
        }
    }
}

run();

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Use the cookies you provided
const VERCEL_COOKIE = '_vcrcs=1.1776767615.3600.MTQ0OTAzMmZlMWI1NmM1YzVjNTFhOWY3ZjM2MTcxMzM=.bba673f41b07fc45b525754d31ba8677; sc_64ahChnOXrBO0MuKZsY14A=15a4624b-4660-451d-8819-abec508be0d7';
const APP_TOKEN = 'token=' + (process.env.TOKEN || ''); // You can also paste the full token here if needed

async function testAhlanFetch() {
    const eventSlug = 'final-afc-5458782'; // Updated slug
    const queueToken = process.env.AHLAN_QUEUE_TOKEN || '';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

    const url = `https://www.ahlan.sa/api/ticketing/eventDetail?slug=${encodeURIComponent(eventSlug)}&queue-token=${encodeURIComponent(queueToken)}`;

    // Get a proxy from data/sor/proxy.txt
    const proxies = fs.readFileSync('data/sor/proxy.txt', 'utf-8').split('\n').filter(Boolean);
    const proxy = proxies[0]; // Just take the first one for testing
    const agent = new HttpsProxyAgent(proxy);

    // Combine your browser cookies with the security cookie
    const combinedCookie = `${VERCEL_COOKIE}; ${APP_TOKEN}`;

    const headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
        'cookie': combinedCookie,
        'user-agent': userAgent,
        'referer': 'https://www.ahlan.sa/',
        'priority': 'u=1, i'
    };

    console.log('--- Testing Fetch with Proxy and Vercel Cookie ---');
    console.log('URL:', url);
    console.log('Proxy:', proxy);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            agent: agent // Note: node-fetch or native fetch in node 18+ might handle agent differently
        });

        console.log('Response Status:', response.status);
        const text = await response.text();

        if (text.includes('Vercel Security Checkpoint')) {
            console.log('❌ FAILED: Still getting the Security Checkpoint page.');
            fs.writeFileSync('./tests/bot_fetch_responses/test_failed_checkpoint.html', text);
            console.log('Saved response to tests/bot_fetch_responses/test_failed_checkpoint.html');
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ SUCCESS: Received JSON response!');
                console.log('Data Preview:', JSON.stringify(json, null, 2).slice(0, 500) + '...');
                fs.writeFileSync('./tests/bot_fetch_responses/test_success_response.json', text);
            } catch (e) {
                console.log('✅ SUCCESS (Maybe?): Received non-checkpoint HTML/Text.');
                console.log('Body Preview:', text.slice(0, 500));
                fs.writeFileSync('./tests/bot_fetch_responses/test_other_response.txt', text);
            }
        }
    } catch (error) {
        console.error('❌ Error during fetch:', error.message);
    }
}

testAhlanFetch();

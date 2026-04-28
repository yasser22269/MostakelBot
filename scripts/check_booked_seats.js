import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FILE_PATHS } from '../src/utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkBookedSeats() {
    try {
        const DATA_DIR = process.env.DATA_DIR || 'data';
        const accFilePath = FILE_PATHS.ACCOUNTS_FILE;
        const accounts = fs.readFileSync(accFilePath, 'utf-8').split('\n').filter(line => line.trim() !== '');

        const results = [];
        let total_seats = 0;

        // Concurrency limit
        const CONCURRENCY = 200;
        const chunks = [];
        for (let i = 0; i < accounts.length; i += CONCURRENCY) {
            chunks.push(accounts.slice(i, i + CONCURRENCY));
        }

        async function processAccount(account) {
            const [email, pass, token] = account.split(':');

            if (!token) {
                console.warn(`Skipping account ${email} due to missing token.`);
                return null;
            }

            try {
                const response = await fetch('https://api.webook.com/api/v2/user/bookings?lang=en&event_status=upcoming&page=1&hide_vapps=true', {
                    headers: {
                        'accept': 'application/json',
                        'accept-language': 'en-US,en;q=0.9,ar;q=0.8,ar-IQ;q=0.7,de;q=0.6',
                        'authorization': `Bearer ${token}`,
                        'content-type': 'application/json',
                        'origin': 'https://webook.com',
                        'priority': 'u=1, i',
                        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"macOS"',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'same-site',
                        'token': 'e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2',
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
                    }
                });

                if (!response.ok) {
                    console.error(`Error fetching data for ${email}: ${response.statusText}`);
                    return { email, pass, seats: 0, slugs: 'ERROR' };
                }

                const data = await response.json();
                const totalSeats = data.data.reduce((sum, booking) => sum + booking.total_tickets, 0);
                const eventSlugs = data.data.map(booking => booking.event.slug).join(', ');

                if (totalSeats === 0) {
                    console.warn(`Account ${email} has not booked any seats.`);
                    return null;
                }

                console.log(`Account: ${email}, Seats: ${totalSeats}, Slugs: ${eventSlugs}`);
                return { email, pass, seats: totalSeats, slugs: eventSlugs };

            } catch (error) {
                console.error(`Error processing account ${email}:`, error);
                return { email, pass, seats: 0, slugs: 'ERROR' };
            }
        }

        for (const chunk of chunks) {
            const chunkResults = await Promise.all(chunk.map(processAccount));
            for (const res of chunkResults) {
                if (res) {
                    results.push(res);
                    total_seats += res.seats;
                }
            }
        }

        const outputFilePath = path.join(DATA_DIR, 'sor', 'number_of_booked_seats_for_each_acc.txt');

        // Formatting the output as a table
        const header = ['Email', 'Password', 'Seats', 'Event Slugs'];
        const rows = results.map(r => [r.email, r.pass, r.seats.toString(), r.slugs]);

        const colWidths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));

        const formatRow = (row) => row.map((val, i) => val.padEnd(colWidths[i])).join(' | ');
        const separator = colWidths.map(w => '-'.repeat(w)).join('-+-');

        let outputContent = formatRow(header) + '\n' + separator + '\n';
        outputContent += rows.map(formatRow).join('\n');
        outputContent += `\n${separator}\n`;
        outputContent += `Total Seats: ${total_seats}\n`;

        fs.writeFileSync(outputFilePath, outputContent);

        console.log(`\nResults saved to ${outputFilePath}`);

    } catch (error) {
        console.error('An error occurred:', error);
    }
}

checkBookedSeats();

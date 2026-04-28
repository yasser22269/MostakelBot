import 'dotenv/config';
import { execSync } from 'child_process';
import { getAccounts, getProxies, holdObject, main as utilsMain, freeSeats, update, startWorker, log } from './utils.js';
import { FILE_PATHS } from './config.js';
import fs from 'fs';
import { accountSockets } from '../bot/socket_book.js';
import { getAllHeldObjects } from '../bot/heldObjects.js';
import EventEmitter from 'events';
import { BOT_SETTINGS } from './config.js';
import { accountsShiftedForBooking } from '../../scripts/socket_listen.js';

export async function main(runSocketListener = true,currentAccountFile) {
  let holdTokens = {};
    EventEmitter.setMaxListeners()
    const botVersion = process.env.BOT_VERSION || 'v1';
    //log('info', `Running bot version: ${botVersion}`);
    const PROMPT_URL_v1 = "https://webook.com/ar/events/syria-basketball-team-tickets-fiba--season--asia-cup-2025-fjhdu832";
    const PROMPT_URL_v2 = "https://webook.com/ar/events/saudi-pro-league-week-1-damac-vs-al-hazem-spl-685149";
    const url = process.env.PROMPT_URL || (botVersion === 'v2' || botVersion === 'v3' ? PROMPT_URL_v2 : PROMPT_URL_v1);

    await utilsMain({

        ...process.env,
        BOT_VERSION: botVersion,
        FORCE_CHANNEL_TYPE: process.env.FORCE_CHANNEL_TYPE,
        BLOCK_NAME: process.env.BLOCK_NAME,
        PROMPT_URL: url
    });
    await update();

    let accounts;
   currentAccountFile? accounts = getAccounts(currentAccountFile) : accounts = getAccounts();
    const proxies = getProxies();

    const processAccount = async (account, workerPromises, seatsToHoldForThisAccount) => {
        //log('info', 'starting processAccount');
        const seatsToHold = seatsToHoldForThisAccount;

        if (seatsToHold.length > 0) {
            log('info', `Account ${account.split(':')[0]} will attempt to hold ${seatsToHold.length} seats.`);
            const heldSeats = [];
            let proxy = null;

            let holdResults = [];
            const currentProxyIndex = Math.floor(Math.random() * proxies.length);
            proxy = proxies.length > 0 ? proxies[currentProxyIndex] : null;
            if (botVersion === 'v1') {
                log('info', 'Holding seats sequentially for v1');
                for (const seat of seatsToHold) {
                  //log('warning', `hold tokens are `, holdTokens);
                    const holdToken = holdTokens[account.split(':')[0]][holdTokens[account.split(':')[0]].length - 1];
                    const result = await holdObject(account, proxy, seat,null,false,'hold-object',holdToken);
                    holdResults.push(result);
                    // wait 1 second
                    //await new Promise(resolve => setTimeout(resolve, 3000));
                }
            } else {
                const holdPromises = seatsToHold.map(seat => {
                    const currentProxyIndex = Math.floor(Math.random() * proxies.length);
                    proxy = proxies.length > 0 ? proxies[currentProxyIndex] : null;
                    return holdObject(account, proxy, seat);
                });
                holdResults = await Promise.all(holdPromises);
            }

            for (let i = 0; i < holdResults.length; i++) {
                const [holdSuccessful] = holdResults[i];
                const seat = seatsToHold[i];
                if (holdSuccessful) {
                    heldSeats.push(seat);
                } else {
                    log('error', `Failed to hold seat ${seat.name || seat.objectLabelOrUuid || seat.label} for ${account.split(':')[0]}`);
                }
            }

            if (heldSeats.length > 0) {
                log('success', `Successfully held ${heldSeats.length} seats for ${account.split(':')[0]}. Starting worker.`);
                if (process.env.SKIP_PAYMENT != 'true') {
                    workerPromises.push(startWorker(account, proxy, heldSeats));
                }
            } else {
                log('warning', `Could not hold any seats for ${account.split(':')[0]}.`);
            }
        } else {
            if (process.env.KEEP_WAITING_FIRSTLAUNCH_SCRIPT_TO_FIND_SEATS_WITHOUT_SOCKET == 'true') {
                await update();
            } else {
                //log('info', `No seats assigned to account ${account.split(':')[0]}. Skipping...`);
            }
        }
    };

    const accountSeatAssignments = new Map(); // Map<account, Seat[]>
    let accountsToProcess = [];

     holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE));
    if (botVersion === 'v2' || botVersion === 'v3') {
        const currentHeldObjects = getAllHeldObjects();
        const maxTickets = parseInt(process.env.MAX_TICKET_PER_ACCOUNT) || 10;

        // Filter and enrich accounts with their current held counts
        const connectedAccounts = accounts.filter(acc => accountSockets.has(acc.split(':')[0])).map(acc => {
            const email = acc.split(':')[0];
            const tokens = holdTokens[email] || [];
            let heldCount = 0;
            for (const tokenItem of tokens) {
                const token = typeof tokenItem === 'object' ? tokenItem.token : tokenItem;
                if (currentHeldObjects[token]) {
                    heldCount += currentHeldObjects[token].length;
                }
            }
            return { account: acc, heldCount, remaining: Math.max(0, maxTickets - heldCount) };
        });

        // Sort by held count (ascending) to prioritize least-loaded accounts
        connectedAccounts.sort((a, b) => a.heldCount - b.heldCount);

        // Distribute seats based on remaining capacity
        for (const entry of connectedAccounts) {
            if (freeSeats.length === 0) break;
            if (entry.remaining <= 0) continue;

            const toAssign = Math.min(
                freeSeats.length,
                entry.remaining,
                BOT_SETTINGS.TICKET_PER_ACCOUNT > 0 ? BOT_SETTINGS.TICKET_PER_ACCOUNT : Infinity
            );

            if (toAssign > 0) {
                accountSeatAssignments.set(entry.account, freeSeats.splice(0, toAssign));
                accountsToProcess.push(entry.account);
            }
        }

        console.log('info', `Found ${connectedAccounts.length} connected accounts. Assigned seats to ${accountsToProcess.length} accounts based on capacity.`);
    } else {
        accountsToProcess = accounts;

        if (BOT_SETTINGS.TICKET_PER_ACCOUNT === -1 && freeSeats.length > 0) {
            const totalFreeSeats = freeSeats.length;
            const numAccountsToDistribute = Math.min(BOT_SETTINGS.THREADS, accountsToProcess.length);
            const baseSeatsPerAccount = Math.floor(totalFreeSeats / (numAccountsToDistribute > 0 ? numAccountsToDistribute : 1));
            let remainderSeats = totalFreeSeats % (numAccountsToDistribute > 0 ? numAccountsToDistribute : 1);

            let currentSeatIndex = 0;
            for (let i = 0; i < numAccountsToDistribute; i++) {
                const account = accountsToProcess[i];
                let numSeatsForThisAccount = baseSeatsPerAccount;
                if (remainderSeats > 0) {
                    numSeatsForThisAccount++;
                    remainderSeats--;
                }
                accountSeatAssignments.set(account, freeSeats.slice(currentSeatIndex, currentSeatIndex + numSeatsForThisAccount));
                currentSeatIndex += numSeatsForThisAccount;
            }
        } else if (BOT_SETTINGS.TICKET_PER_ACCOUNT > 0) {
            for (const account of accountsToProcess) {
                accountSeatAssignments.set(account, freeSeats.splice(0, BOT_SETTINGS.TICKET_PER_ACCOUNT));
            }
        }
    }

    const workerPromises = [];
    const accountPromises = [];

    for (let i = 0; i < Math.min(BOT_SETTINGS.THREADS, accountsToProcess.length); i++) {
        const account = accountsToProcess[i];
        const seatsForThisAccount = accountSeatAssignments.get(account) || [];
        accountPromises.push(processAccount(account, workerPromises, seatsForThisAccount));
    }
    await Promise.all(accountPromises);

    //log("info", "All accounts processed, waiting for workers to complete...");
    await Promise.all(workerPromises);
    //log("info", "All workers completed.");

    //log("info", "Starting socket listener...");
    if (runSocketListener) {
        execSync('node scripts/socket_listen.js', { stdio: 'inherit', cwd: process.cwd() });
    }
}

// main(true);
// check if the file is launched from the terminal
if (process.argv.includes('--run-socket-listener')) {
    main(true);
}else{
    console.log('note you should use --run-socket-listener to run the file')

}

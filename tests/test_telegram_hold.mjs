import 'dotenv/config';
import { sendToTelegram } from '../src/utils/utils.js';

// Force send even if sendTG=false in .env
process.env.sendTG = 'true';

// Simulate what the bot sends after a successful hold
const account = 'rimastouta@outlook.sa:Mono8888@:sometoken';
const item = { objectLabelOrUuid: '66-G-2' };
const promptUrl = process.env.PROMPT_URL;

const message = `${account.split(':')[0]} ${account.split(':')[1]}\nHeld: ${item.objectLabelOrUuid}\nEvent URL: ${promptUrl}`;

console.log('--- Message to be sent ---');
console.log(message);
console.log('--------------------------');

await sendToTelegram(message);
console.log('Done.');

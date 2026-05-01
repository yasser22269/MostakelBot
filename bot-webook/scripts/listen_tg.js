import fs from 'fs';
import 'dotenv/config';
import { updateHeldObjectsFromAPI } from './release.js';
import { sendToTelegram } from '../src/utils/utils.js';
import { FILE_PATHS } from '../src/utils/config.js';

const apiKey =process.env.BOT_TOKEN;
const targetChatId = process.env.tgChannelKey;

if (!targetChatId) {
    console.error("tgChannelKey not found in .env");
    process.exit(1);
}

async function pollTelegram() {
    let lastUpdateId = 0;
    console.log(`Bot started, listening for /seats on chat ID: ${targetChatId}...`);

    while (true) {
        try {
            const url = `https://api.telegram.org/bot${apiKey}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.ok && data.result.length > 0) {
                const updates = data.result;
                lastUpdateId = updates[updates.length - 1].update_id;

                await Promise.all(updates.map(async (update) => {
                    try {
                        if (update.callback_query) {
                            await handleCallbackQuery(update.callback_query);
                            return;
                        }

                        const message = update.message || update.channel_post;
                        if (!message) return;

                        const chatId = message.chat.id.toString();
                        const text = message.text || '';

                        // Check if it's the command /seats in the right chat
                        if (chatId === targetChatId && text.trim().startsWith('/s')) {
                            console.log(`Received /seats command from ${chatId}`);
                            await handleSeatsCommand();
                        }
                    } catch (err) {
                        console.error('Error handling update:', err);
                    }
                }));
            }
        } catch (error) {
            console.error('Error polling Telegram:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

async function handleCallbackQuery(callbackQuery) {
    const { id, data } = callbackQuery;
    
    if (data.startsWith('show_seats:')) {
        const email = data.split(':')[1];
        
        try {
            if (!fs.existsSync(FILE_PATHS.HELD_OBJECTS_FILE)) {
                return;
            }

            const heldObjects = JSON.parse(fs.readFileSync(FILE_PATHS.HELD_OBJECTS_FILE, 'utf-8'));
            let holdTokens = {};
            if (fs.existsSync(FILE_PATHS.HOLD_TOKENS_FILE)) {
                holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));
            }

            // Find all tokens for this email
            const tokens = holdTokens[email] || [];
            let labels = [];
            
            for (const token of tokens) {
                if (heldObjects[token]) {
                    const tokenLabels = heldObjects[token].map(obj => typeof obj === 'string' ? obj : (obj.label || obj.objectId || JSON.stringify(obj)));
                    labels.push(...tokenLabels);
                }
            }

            // Also check if email was used as token key
            if (labels.length === 0 && heldObjects[email]) {
                labels = heldObjects[email].map(obj => typeof obj === 'string' ? obj : (obj.label || obj.objectId || JSON.stringify(obj)));
            }

            const alertText = labels.length > 0 
                ? `Seats for ${email}:\n${labels.join(', ')}`
                : `No seats found for ${email}`;

            await fetch(`https://api.telegram.org/bot${apiKey}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callback_query_id: id,
                    text: alertText,
                    show_alert: true
                })
            });
        } catch (error) {
            console.error('Error handling callback query:', error);
        }
    }
}

async function handleSeatsCommand() {
    try {
        console.log('Updating held objects from API...');
        await updateHeldObjectsFromAPI();

        if (!fs.existsSync(FILE_PATHS.HELD_OBJECTS_FILE)) {
            await sendToTelegram("Held objects file not found.");
            return;
        }

        const heldObjects = JSON.parse(fs.readFileSync(FILE_PATHS.HELD_OBJECTS_FILE, 'utf-8'));
        
        let holdTokens = {};
        if (fs.existsSync(FILE_PATHS.HOLD_TOKENS_FILE)) {
            holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));
        }

        // Map token to email
        const tokenToEmail = {};
        for (const [email, tokens] of Object.entries(holdTokens)) {
            if (Array.isArray(tokens)) {
                tokens.forEach(token => {
                    tokenToEmail[token] = email;
                });
            }
        }

        const report = {};
        for (const [token, objects] of Object.entries(heldObjects)) {
            const email = tokenToEmail[token] || (token.includes('@') ? token : `Token: ${token.slice(0, 8)}...`);
            if (!report[email]) report[email] = 0;
            report[email] += (Array.isArray(objects) ? objects.length : 0);
        }

        const emailList = Object.keys(report);
        if (emailList.length === 0) {
            await sendToTelegram("No seats are currently held.");
            return;
        }

        let message = "<b>💺 Current Seats Held Report</b>\n\n";
        let total = 0;
        
        // Sort by count descending
        emailList.sort((a, b) => report[b] - report[a]);

        const inlineKeyboard = [];
        let currentRow = [];

        for (const email of emailList) {
            const count = report[email];
            message += `👤 <code>${email}</code>: <b>${count}</b> seats\n`;
            total += count;

            currentRow.push({
                text: `💺 ${email.split('@')[0]}`,
                callback_data: `show_seats:${email}`
            });

            if (currentRow.length === 2) {
                inlineKeyboard.push(currentRow);
                currentRow = [];
            }
        }
        
        if (currentRow.length > 0) {
            inlineKeyboard.push(currentRow);
        }
        
        message += `\n━━━━━━━━━━━━━━━\n<b>Total Held: ${total}</b>`;

      console.log('the message is',message)
        await sendToTelegram(message, {
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        });
        console.log('Sent report to Telegram');
    } catch (error) {
        console.error('Error handling /seats command:', error);
        await sendToTelegram(`❌ Error updating seats info: ${error.message}`);
    }
}

pollTelegram();

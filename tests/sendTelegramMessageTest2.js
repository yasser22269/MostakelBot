import 'dotenv/config';
 async function sendToTelegram(message) {
// const chatIds = ['-1002922665235']   turki 
          //
// const chatIds = ['-1003112777348'] //abosaid
    //const chatIds = [process.env.tgChannelKey]
   const chatIds = [process.env.tgChannelKey]
   console.log('chatIds',chatIds);
    const apiKey =process.env.BOT_TOKEN;
    const url = `https://api.telegram.org/bot${apiKey}/sendMessage`;
    if (process.env.sendTG == 'false') return;

    for (const chatId of chatIds) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                }),
            });
            if (response.ok) {
                console.log(`Telegram message sent to ${chatId}`);
            } else {
                const errorData = await response.json();
                console.log(`Failed to send Telegram message to ${chatId}: ${response.status} ${response.statusText}`, errorData);
            }
        } catch (error) {
            console.log(`Error sending Telegram message to ${chatId}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

await sendToTelegram('hello from the bot');


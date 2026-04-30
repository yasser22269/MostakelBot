import 'dotenv/config';

async function testTelegram() {
    const chatId = process.env.tgChannelKey;
    const apiKey = process.env.BOT_TOKEN;
    const url = `https://api.telegram.org/bot${apiKey}/sendMessage`;

    if (!apiKey || !chatId) {
        console.error("❌ Missing BOT_TOKEN or tgChannelKey in .env");
        return;
    }

    console.log(`Sending to chat ${chatId} using bot token ${apiKey.substring(0, 10)}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: "🚀 <b>Test Message</b> from WeBook Bot (Local Test)",
                parse_mode: 'HTML'
            }),
        });

        const data = await response.json();
        if (response.ok) {
            console.log('✅ Telegram test successful! Message sent.');
        } else {
            console.error('❌ Telegram test failed:', data);
        }
    } catch (err) {
        console.error('❌ Network error sending to Telegram:', err.message);
    }
}

testTelegram();

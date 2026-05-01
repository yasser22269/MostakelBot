import { ApiConfig } from '../lib/chunk-LPIRJEMY.js';
import { useLogin } from '../lib/chunk-7ANTOXLV.js';
import { fetchClient } from '../lib/chunk-K342ITN7.js';
import { createCookie } from '../lib/chunk-UFCTKZW2.js';
import { generateRecaptchaToken } from '../lib/chunk-W4XMZLKW.js';
import { generateMd5 } from '../lib/chunk-VRTIRCR3.js';
import fs from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import md5 from 'md5';

function generateSignature(t, e) {
    const n = "9126a26b-3b5f-4333-ba8f-9e3a67392a3d";
    return md5(t + e + n)
}

const colors = {
  info: "\x1b[36m",
  success: "\x1b[32m",
  warning: "\x1b[33m",
  error: "\x1b[31m",
  reset: "\x1b[0m",
};

function log(level, ...args) {
  const options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  };
  const timestamp = new Date().toLocaleString(undefined, options);
  const color = colors[level] || colors.info;
  const message = args.map(arg => (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg).join(' ');
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
}

async function changeEmail(account, newEmailLine) {
    try {
        const agent = null; // No proxy needed for this script
        ApiConfig.init({
            wbk: {
                api: "https://api.webook.com/api/v2",
                authApi: "https://api.webook.com/api/v2",
                apiToken: "e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2",
                appSource: "rs",
                paymentApi: "https://payments.webook.com/api/v2",
                ticketingDomain: "https://webook.com",
                socketApi: "https://realtime.webook.com",
                geoApi: "https://geolocation.webook.com"
            },
            hy: {
                api: "https://app.halayalla.com/api",
                apiToken: "vQZe4VNDqYraFI815Us0ZTtmHC9AKRdtMhEkJi2DXfeHhn1P3550jUBFqX7GFbJO"
            },
            blog: {
                api: "https://webook.com"
            },
            grecaptcha: {
                v3Key: "6LcvYHooAAAAAC-G46bpymJKtIwfDQpg9DsHPMpL"
            },
            cookie: {
                domain: "webook.com"
            }
        });

        const [email, password, token] = account.split(':');
        const [newEmail, newPassword] = newEmailLine.split(':');

        if (token) {
            log('info', 'Using prepared access token for', email);
            createCookie({ name: 'token', value: token, domain: 'webook.com', path: '/', secure: true, sameSite: 'Strict' });
        } else {
            log('error', 'No token found for', email);
            return;
        }

        const headers = {
            "Content-Type": "application/json"
        };
        
        const captcha = await generateRecaptchaToken('update_email');
        const signature = generateMd5(newEmail);

        const emailChangeBody = {
            new_email: newEmail,
            lang: 'ar',
            signature: signature,
            captcha: captcha,
            app_source: 'rs'
        };

        const updateEmailRes = await fetch("https://api.webook.com/api/v2/update-email", {
            "headers": {
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.9,ar;q=0.8,ar-IQ;q=0.7,de;q=0.6",
                "authorization": `Bearer ${token}`,
                "content-type": "application/json",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "token": "e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2"
            },
            "body": JSON.stringify(emailChangeBody),
            "method": "POST"
        }).then(res => res.json());

        if (updateEmailRes['status'] == 'success') {
            log('success', `Successfully updated email for ${email} to ${newEmail}`);
            const outputLine = `${email}:${password}:${newEmail}:${newPassword}\n`;
            fs.writeFileSync('../../data/replaced_accs.txt', outputLine, { flag: 'a' });
        } else {
            log('error', `Failed to update email for ${email}`, updateEmailRes);
        }

    } catch (error) {
        const stackTrace = error.stack;
        log('error', 'Error during email change for', account.slice(0, 60), '...', ':', error.message, '\n', stackTrace);
    }
}

async function main() {
    const accountsToChange = fs.readFileSync('../../data/sor/acc_need_to_replace_email.txt', 'utf-8').split('\n').filter(Boolean);
    const newEmails = fs.readFileSync('../../data/sor/emails_to_be_used_in_replace.txt', 'utf-8').split('\n').filter(Boolean);

    if (accountsToChange.length !== newEmails.length) {
        log('error', 'The number of accounts and new emails must be the same.');
        return;
    }

    for (let i = 0; i < accountsToChange.length; i++) {
        await changeEmail(accountsToChange[i], newEmails[i]);
    }
}

main();
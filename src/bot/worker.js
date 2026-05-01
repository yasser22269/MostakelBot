import { parentPort, workerData } from 'worker_threads';
import { ApiConfig } from '../lib/chunk-LPIRJEMY.js';
import { useLogin } from '../lib/chunk-7ANTOXLV.js';
import { fetchClient } from '../lib/chunk-K342ITN7.js';
import { createCookie } from '../lib/chunk-UFCTKZW2.js';
import { generateRecaptchaToken } from '../lib/chunk-W4XMZLKW.js';
import fs from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { hold_object } from './socket_book.js';
import { createBookedSeatObject_section } from './create_booked_seat_object.js';
import { constructBookedSeatObject as constructBookedSeatObject_v1 } from './create_booked_seat_object_v1.js';
import 'dotenv/config'
import { fetchRenderingInfo as fetchRenderingInfoV1, getOrCreateBrowserId } from '../seatsio/seatsioclasses.js';

const { 
  account, proxy, url, usePreparedAccessTokens, blockName,  freeSeatsBatch, isSeason,
  chartKey, eventId, workspaceKey, browserId, isGeneralAdmissionAreas, eventKey, channelKeysToCheck, 
  renderingInfo, publishedDetails, objectStatuses, eventDetails, holdToken, botVersion, chartToken 
} = workerData;

const [email, password, token] = account.split(':');
        async function sendToTelegram(message, chatIdOverride) {
            if (process.env.sendTG == 'false') return;
// const chatIds = ['-1002922665235']   //turki 
          //
    const chatIds = [process.env.tgChannelKey]
  const apiKey =process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${apiKey}/sendMessage`;
  const targets = chatIdOverride ? [chatIdOverride] : chatIds;
  for (const chatId of targets) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        }),
      });
      if (response.ok) {
        console.log('success', `✅ تم إرسال رسالة التليجرام بنجاح إلى ${chatId}!`);
      } else {
        const errorData = await response.json();
        console.log('error', `❌ فشل إرسال رسالة التليجرام إلى ${chatId}: ${response.status} ${response.statusText}`, errorData);
      }
    } catch (error) {
      console.log('error', `❌ خطأ في إرسال رسالة التليجرام إلى ${chatId}:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
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

async function bookTicket() {
    try {
        const agent = proxy ? new HttpsProxyAgent(proxy) : null;
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

        if (usePreparedAccessTokens && token) {
            log('info', 'Using prepared access token for', email);
            createCookie({ name: 'token', value: token, domain: 'webook.com', path: '/', secure: true, sameSite: 'Strict' });
        } else {
            await useLogin({
                lang: 'en',
                agent
            }).mutate({ email, password }, {
                onSuccess: (data) => {
                    log('success', 'Login successful for', email);
                },
                onError: (error) => {
                    log('error', 'Login failed for', email, ':', error);
                    throw error;
                }
            });
        }

        log('info', 'Using pre-fetched hold token ID:', holdToken);

        const objectsInfoToCheckOut = [];
        console.log('current channel keys to check in the booking worker is', channelKeysToCheck);
        
        let teamKey;
        for (const item of freeSeatsBatch) {
            const freeSeat = item;
            objectsInfoToCheckOut.push(freeSeat);
            teamKey = item.teamKey;
            parentPort.postMessage({ type: 'seatHeld' });
        }


        if (objectsInfoToCheckOut.length === 0) {
            throw new Error('Could not hold any seats');
        }

        const DATA_DIR = process.env.DATA_DIR || 'data';
        const objectsInfoToCheckOutOrder = [];
        if (botVersion === 'v2') {
            if (!isGeneralAdmissionAreas) {
                for (const currentSeat of objectsInfoToCheckOut) {
                    const [section, parent, own] = currentSeat.label.split('-');
                    const bookedSeat = createBookedSeatObject_section(own, parent, section, renderingInfo, publishedDetails, objectStatuses, eventDetails, holdToken);
                    log('info', 'Booked seat:', bookedSeat);
                    objectsInfoToCheckOutOrder.push(bookedSeat);
                }
            } else {
                log('error', 'General admission not supported for now');
                return;
            }
        } else {
            for (const currentSeat of objectsInfoToCheckOut) {
                console.log('preparing objectsInfoToCheckOut for', currentSeat);
                
                const selectedSeats = objectsInfoToCheckOut.map(seat => seat.objectLabelOrUuid);
                const bookedSeat = constructBookedSeatObject_v1(currentSeat.objectLabelOrUuid, renderingInfo, publishedDetails, objectStatuses, eventDetails, holdToken, selectedSeats);
                // write to generated_booked_seat_object_v1.json
                fs.writeFileSync(`./${DATA_DIR}/sor/generated_booked_seat_object_v1.json`, JSON.stringify(bookedSeat, null, 4));
                objectsInfoToCheckOutOrder.push(bookedSeat);
            }
        }
        const headers = {
            "Content-Type": "application/json"
        };
        //update the favorate team  to teamKey 
        let endpoint = '/update-profile?lang=en';
        if (teamKey){
                    
                const  favTeamBody = {
                   favorite_team: teamKey , }
        const updateFavTeamRes = await fetchClient({
                    baseUrl: ApiConfig.config.wbk.authApi,
                    url: endpoint,
                    agent,
                    options: {
                    agent,
                        method: "POST",
                        body: JSON.stringify(favTeamBody),
                        includeAuth: true,
                        includeToken: true,
                        headers: headers
                    }
                });
            if (updateFavTeamRes['status'] == 'success') {
                log('success', 'Successfully updated favorite team to ', teamKey);
                log('info', 'current user data is ', updateFavTeamRes);
            }else       {
                log('error', 'Failed to update favorite team to ',teamKey, updateFavTeamRes);
            }


        }else{
            log('error', 'Failed to update favorite team  got no team key');
        }
// return;
        const captcha = await generateRecaptchaToken('checkout');
        const lang = botVersion === 'v2' ? 'en' : 'ar';
        const utmSessionId = botVersion === 'v2' ? "5db2f0f9-748d-4125-a142-9db8d9b0576d" : "d475feca-bbd2-48fc-81bb-e5cd2cff10d4";
        const checkoutOrder = {
            "event_id": eventId,
            "redirect": "https://webook.com/ar/payment-success",
            "redirect_failed": "https://webook.com/ar/payment-failed",
            "booking_source": "rs-web",
            "lang": lang,
            "payment_method": "credit_card",
            "is_wallet": false,
            "saudi_redeem": null,
            "is_mada": false,
            "is_amex": false,
            "perks": [],
            "merchandise": [],
            "addons": [],
            "vouchers": [],
            // time_slot_id: eventDetails.data._id,
            "holdToken": holdToken,
            "selectedSeats": JSON.stringify(objectsInfoToCheckOutOrder),
            "season_id": eventId,
            "captcha": captcha,
            "tpp_cart_id": null,
            "app_source": "rs",
            "utm_wbk_wa_session_id": utmSessionId
        };
        // write the checkoutOrder to fs 
        fs.writeFileSync(`./${DATA_DIR}/sor/checkoutOrderForTest.json`, JSON.stringify(checkoutOrder, null, 4));

         endpoint = isSeason ? `/season-seat/checkout?lang=${lang}` : `/event-seat/checkout?lang=${lang}`;
        if (botVersion === 'v2') {
            headers["token"] = "e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2";
        }
        const cookie = process.env.PREPARE_TOKEN_COOKIE;
        const checkoutResJson = await fetchClient({
            baseUrl: ApiConfig.config.wbk.authApi,
            url: endpoint,
            agent,
            cookie,
            options: {
            agent,
                method: "POST",
                body: JSON.stringify(checkoutOrder),
                includeAuth: true,
                includeToken: true,
                headers: headers
            }
        });

        if (checkoutResJson["status"] == "success") {

            const paymentUrl = decodeURIComponent(checkoutResJson.data.redirect_url);
            const checkoutSeats = objectsInfoToCheckOutOrder.map(seat => seat.label).join(', ');
            const totalCheckoutPrice = objectsInfoToCheckOutOrder.reduce((total, seat) => total + seat.pricing.price, 0);
            const objInfo =  `${paymentUrl}: ${checkoutSeats}: ${totalCheckoutPrice}: ${email}:${password}\n`;
            fs.writeFileSync(`./${DATA_DIR}/sor/payment_urls.txt`,objInfo, { flag: 'a' });
            sendToTelegram(objInfo)

            log('success', 'Payment URL:', paymentUrl);
            parentPort.postMessage({ status: 'success', account, paymentUrl });
        } else {
            const str = JSON.stringify(checkoutResJson, null, 2);
            log('error','checkout failed', str);
            throw new Error('Checkout failed');
        }

    } catch (error) {
        const stackTrace = error.stack;
        log('error', 'Error during booking for', account.slice(0, 60), '...', ':', error.message, '\n', stackTrace);
        parentPort.postMessage({ status: 'fail', account, error: error.message });
    }
}

bookTicket();

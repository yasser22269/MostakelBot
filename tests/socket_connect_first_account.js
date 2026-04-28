import 'dotenv/config';
import fs from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { establish_socket_connection, accountSockets } from '../src/bot/socket_book.js';
import { FILE_PATHS, solveV3Wrapper } from '../src/utils/config.js';
import { getAccounts, getProxies } from '../src/utils/utils.js';

function generateTracingSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function buildHoldUrl(eventKey, holdToken, teamId, reCaptchaToken) {
  const tracingId = `${Date.now()}-${generateTracingSuffix()}`;
  return `wss://api.seatcloud.com:8443/?event=${eventKey}&token=${holdToken}&teamID=${teamId}&reCaptchaToken=${reCaptchaToken}&tracingId=${tracingId}`;
}

function normalizeHoldToken(rawToken) {
  if (!rawToken) return null;
  if (typeof rawToken === 'string') return rawToken;
  if (typeof rawToken === 'object' && rawToken.token) return rawToken.token;
  return null;
}

async function main() {
  const isSeason = process.env.IS_SEASON === 'true';
  const botVersion = process.env.BOT_VERSION;

  const eventDetails = JSON.parse(fs.readFileSync(FILE_PATHS.EVENT_DETAILS_FILE, 'utf-8'));
  const renderingInfo = JSON.parse(fs.readFileSync(FILE_PATHS.RENDERING_INFO_FILE, 'utf-8'));
  const publishedDetails = JSON.parse(fs.readFileSync(FILE_PATHS.PUBLISHED_DETAILS_FILE, 'utf-8'));
  const holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));

  const eventData = eventDetails?.data || eventDetails;
  const eventKeyV2 = isSeason ? eventData?.seats_io?.season_key : eventData?.seats_io?.event_key;
  const eventKey = botVersion === 'v2' || botVersion === 'v3'
    ? eventKeyV2
    : renderingInfo?.seasonStructure?.topLevelSeasonKey;

  if (!eventKey) {
    throw new Error('Could not resolve event key from local files.');
  }

  const allAccounts = getAccounts(FILE_PATHS.ACCOUNTS_FILE);
  const firstAccount = allAccounts[0];
  if (!firstAccount) {
    throw new Error(`No accounts found in ${FILE_PATHS.ACCOUNTS_FILE}`);
  }

  const accountEmail = firstAccount.split(':')[0];
  const accountTokens = holdTokens?.[accountEmail] || [];
  const holdToken = normalizeHoldToken(accountTokens[accountTokens.length - 1]);
  if (!holdToken) {
    throw new Error(`No hold token found for first account: ${accountEmail}`);
  }

  const teamId = publishedDetails?.teamId || publishedDetails?.team_id;
  if (!teamId) {
    throw new Error('Could not resolve team ID from published details.');
  }

  const websiteURL = 'https://chart.seatcloud.com';
  const websiteKey = '6Lf7x-8qAAAAACTG6gffMEWoXQoQhKS6UWTkG9cD';
  //const reCaptchaToken = await solveV3Wrapper(websiteURL, websiteKey, 'submit', 0.9);
  let reCaptchaToken = '0cAFcWeA5ors9UPMprpzqHiIItuO4DB0e_MwuaWEK6AmdqyKoWAdjny5a-IAN6bs1aXOk_uhxfNwQiZhuXzq5x3f--rlf4hDARlxX41t1bsNmX0bi_SJH50kmevEfS4VmJ7o09r0BcFkawC704QMEbnsBAIF-oOUV62lklEY3HPqcKWPhZ16gtzvW0_ic787_92fZhVwZpMS1Ib2zn43MqQtJxW4Of8TUrEQbr4HKDt5ORzTrlyn18ahiI-RWgHQ2x97CzVuwpFdc8XuJvk8-sEBYq8-ABavVIw1DJbJqwi8J9n2r3tezm5Vj9HYmUwMWiLoTqMjn1KwcKcyKoYy-ItsCqyRNHQ_DeM3mGFqn1xUBAicCar9ZDQ0nqJuBNt8oMZgn_CGZn5VQfdCyR0ug5XKvEIlo0pOpxxLvOqPrNNZAttfx7-xW1BDfZH76vrMyDkmdjKjA0xv1M5-xFZ2LmDJp5SVaz3awXprPKAABi0Yh-NqmYsPdp1UMIKszp_KEEJpfeJSXZO7FkuEFOROt3J2FeV-mMTAjcy5ElC0YJ3rePzRQbOsUfQtiADeusS02HBKi909rCFIJ7iiCizEPuFUF5PiABavHyS6yTBDxjqsgns0wvKO_y6g_axiiqbgJHNK67g_ecHFc6Xz7q-EiDaAemIOb9xUuj9m1K4X5FE1vi3ASjq8GIre9LvsIANqDGbGJK5WRHI-lEbvahrL3fo1LFKjLtKW8GwLKNSlYNh-ulS4QQb2rZEp2IniRNr9dD3ItgjIiXoyJO6SpcxNlC6s9ffDg2vOLpiptjMxo8xmT-ASiB2UeyfBxDWrw5APSBtfmR1QTlltYbTnSSqYRWfTG_WqFow5l8TZ6_ghCaqTf8yFQTdSKf5_Ld-8juEBtgq_60rRQOHqp71h0Qw8OZPDp2SMAhXacGl1QCmL7eYx2xTvmBHDBRUNdVVW7ebEPKMrPnDaQz06yPd0Kvl3k5OGLuZE0J1NqWNEMh5ypX8WRTiRCF_iT3YvkiTbvPSkM_j4z-PsM8dzt9OJZdo6J99RQqNq9vPipAQnuNU3T91Za-F0yXGrufhjgmEaWCuXdccgWSfYRGJEpOKAf-aw5LwUd_CWA3gnWv0MWf6g8nUWU5kcHbWfhyhU8pw5noBJ8FJ0n0244n5f0DWZZBFVr7Bk5IkZnqWUNf9zEism1qvbogVLB0trejM9wkFqxPonsOAYcLcCwTecUNl_vkmoRV9ozyR7DM3WJbSB1XJ_IARxyKf3uybLM0HNSTFIhkDXBYraRtD3bZCHbWs2ylgNtPOolk9yYRBeG2LFEksEHtupvtcRKYPSu8kwr1vidR5HJzg6uvdjOManfbCU_3K7zU9Yvx4U1PAHtfoRP5sH1w6oGLPZlxWKnGo3LReg8hyJUtn6B6MHbfMnuDr5-6T8122obx46Oc77_K3SShGycWtRZk0aYpz2ZsoXL_cxCngEVzvDzyxv3Y99VNGa-P1u_msgptUeXCBPY2QNbIq4D6xthU5VTkWTuMUQiRvZHhzX0l0nsah4mmR0dpvZF6oVvf-sCN4npDBkqAvbsciC4xj73TmDTqFvuVYfYbxowf5RroCWyyaVwgbq9K2OVeMRO9KaSSfOZFtr_KjJm13_8z4X353vnfj8xSk0V5ZKJZFSfVUrLi_k_yddxuT-5ECy9Cuos2lTXxqMQJQiiYypFdDqbc40I75kS0nSvKjAVy9rEunWoZ56bc97QFfn4l5eINA-CyJxYK8bSXSJuobe4eSacJXUB_jgpBIbBO9wsOf4G8oM-dowSmukwEohCZgjBJkw3UpjDqJSRf_qhhxSEqsv5oRk217it1q7ofFtdgpe-dZsq3HAk9OJiJ9M0h5-QFuGJGT3Qun7Escd3vTlvry66ip0RnTv6yahwW-zrawqAJYctbv5ywEKvGmDRHu2OEscmOqweQbTWebipZCYpFrZy_rMWkMk5O61q7WiU7dDgLb2ufwr0duzvsQUGPsvZQJGd7vH49LoRXZLMhpYRNprMY_RPd7eANjdmYk3C5v5L0ijl3ehGTsZiIt6uEaJbK0KJ02gvez4wM-xL9AFwTcRPa-D90AoTheWMBkxhDujTBDdp_yQIi8PwTF7_iKcYyz92IfVL2SceP92axEzcrrKOIZst0Dju89PA8e4j6CH8nQGtP-ZVlZhqnq4dfg4DJEPJ0BpbGNhartLr8Z7JcqNXSaOB0unu00zs';
  const holdUrl = buildHoldUrl(eventKey, holdToken, teamId, reCaptchaToken);

  let agent = null;
  if (process.env.USE_PROXY_FOR_ESTABLISH_SOCKET_CONNECTIONS === 'true' || process.env.USE_PROXY_FOR_HOLD === 'true') {
    const proxies = getProxies();
    const firstProxy = proxies[0];
    if (firstProxy) {
      agent = new HttpsProxyAgent(firstProxy);
    }
  }

  console.log(`Connecting first account socket: ${accountEmail}`);
  await establish_socket_connection(firstAccount, { holdToken });

  const connected = accountSockets.has(accountEmail);
  console.log(connected
    ? `Connected successfully for ${accountEmail}`
    : `Connection attempt finished, but no open socket recorded for ${accountEmail}`);
}

main().catch((error) => {
  console.error('Failed to connect first account socket:', error);
  process.exitCode = 1;
});

import { main ,whichChannelObjectIsIn,getHashes} from "../src/utils/utils.js";
import {bU} from "../src/seatsio/seatsio_classes.js";
import 'dotenv/config';
import { fetchRenderingInfo } from "../src/seatsio/seatsio_classes.js";
import fetch from 'node-fetch';
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { FILE_PATHS} from "../src/utils/config.js";
import path from 'path';
import fs from 'fs';
import { warn } from "console";
import UserAgent from 'user-agents';


async function testWhereSeatIsIn(){
  await main({...process.env,SKIP_ESTABLISH_SOCKET_CONNECTIONS: 'true'});
  const Hashes = await getHashes();
  console.log('Hashes is ',Hashes);
  console.log('channel is ',whichChannelObjectIsIn('S70-AL-10'));

  
}
//testWhereSeatIsIn();
function testSigneture(){
  let body  = {"events":["m10"],"holdToken":"02042112-945d-4603-a0c3-7f94bf0ce198","objects":[{"objectId":"S49-AA-170"}],"validateEventsLinkedToSameChart":true}
  body = JSON.stringify(body);

  const chartToken = 'eb1411c110be05ee75ed9a9afd5c00d2d06e9174c83b1841e5b1b401f256f013'
  const signature = bU(chartToken,body);
  console.log('signature is ',signature);

}
//testSigneture
async function testIp(){
  const PROXIES_FILE = FILE_PATHS.PROXIES_FILE;
const PROXY_INDEX_FILE = FILE_PATHS.PROXY_INDEX_FILE;
const proxies = fs.readFileSync(PROXIES_FILE, 'utf-8').split('\n').filter(Boolean);
  const proxy = proxies[0]
  console.log('proxy is ',proxy);
  let agent = new HttpsProxyAgent(proxy);
  const url = 'https://api.ipify.org?format=json';
  //const res = await fetchRenderingInfo(url,'','', {}, false, agent);
  const res = await fetch(url, {
    method: 'GET',
    agent
  });
  const data = await res.json();
  console.log('ip address is ',data);
}
//testIp();
function userAgent(){


const userAgent = new UserAgent().toString();
console.log('radom user agent',userAgent);
}
//userAgent();

import WebSocket from 'ws';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import 'dotenv/config';
import { browserFetch } from '../src/utils/browser_fetch.js';

import {FILE_PATHS} from '../src/utils/config.js';

const HELD_OBJECTS_FILE = FILE_PATHS.HELD_OBJECTS_FILE;
const HOLD_TOKENS_FILE =FILE_PATHS.HOLD_TOKENS_FILE;
const EVENT_DETAILS_FILE = FILE_PATHS.EVENT_DETAILS_FILE;
const DEFAULT_SEATCLOUD_WORKSPACE_KEY = "66e63c10464382fb1f049832";
const ENV_SEATCLOUD_WORKSPACE_KEY = process.env.VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY || process.env.SEATCLOUD_WORKSPACE_KEY || DEFAULT_SEATCLOUD_WORKSPACE_KEY;

function hasEventQueryParam(rawUrl) {
  try {
    if (!rawUrl) return false;
    const parsed = new URL(rawUrl);
    return Boolean(parsed.searchParams.get('event'));
  } catch (error) {
    return false;
  }
}

function getSocketPort() {
    if (process.env.SOCKET_PORT) {
        return parseInt(process.env.SOCKET_PORT);
    }
    const DATA_DIR = process.env.DATA_DIR;
    if (DATA_DIR) {
        try {
            const instancesFile = path.join(process.cwd(), 'instances.json');
            if (fs.existsSync(instancesFile)) {
                const instances = JSON.parse(fs.readFileSync(instancesFile, 'utf-8'));
                const instance = instances.find(i => i.dataDir === DATA_DIR);
                if (instance && instance.socketPort) {
                    return instance.socketPort;
                }
            }
        } catch (e) {
            console.error('Error reading socket port from instances.json:', e);
        }
    }
    return 8082;
}

function generateRandomString() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Generate 11 characters (like the examples: dyl10oenxga, q65tuj2zjfb, 6hinicqvdof)
    for (let i = 0; i < 11; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }
    
    return result;
}

export async function  updateHeldObjectsFromAPI() {
  console.log('updateHeldObjectsFromAPI');



  



  // this is the request we will use
  // fetch("https://api.seatcloud.com/adapter/sio/teams/66e63c10464382fb1f049832/events/33b05ad7-ee9a-469c-8a60-b390c962ddc1/render/objects/held?hold_token=722e1b16-d57a-40f3-81ba-7b483533c81a&trace_id=1767336826717-6hinicqvdof", {
//  "headers": {
//    "accept": "*/*",
//    "accept-language": "en-US,en;q=0.9,ar;q=0.8,ar-IQ;q=0.7,de;q=0.6",
//    "priority": "u=1, i",
//    "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
//    "sec-ch-ua-mobile": "?0",
//    "sec-ch-ua-platform": "\"macOS\"",
//    "sec-fetch-dest": "empty",
//    "sec-fetch-mode": "cors",
//    "sec-fetch-site": "same-site",
//    "Referer": "https://chart.seatcloud.com/"
//  },
//  "body": null,
//  "method": "GET"
//});
  //get all hold tokens localy
  const isSeason = process.env.IS_SEASON === 'true';
  let eventDetails =  fs.readFileSync(EVENT_DETAILS_FILE, 'utf-8');
  
  eventDetails = JSON.parse(eventDetails);
  const eventData = eventDetails?.data || eventDetails;
  const eventKey = isSeason ? eventData.seats_io.season_key : eventData.seats_io.event_key;
  const workspaceKey = eventData?.seats_io?.workspace_key || ENV_SEATCLOUD_WORKSPACE_KEY;
  const eventSlug = eventData.slug;
  console.log('from release eventKey is',eventKey);

const heldObjects = {};
  let total_seats = 0;

  try{
    const holdTokens = JSON.parse(fs.readFileSync(HOLD_TOKENS_FILE, 'utf-8'));
    //console.log('holdTokens',holdTokens);
    
// the structure of hold tokens is like {
//  "Yousefryan072@hotmail.com": [
//    "4ea7e6fa-1d0f-44cb-8d22-7aa34f47d532"
//  ],
//  "Kingbadr6715@hotmail.com": [
//    "a35d851a-ee5e-4624-aadb-1304f324d4cb"
//  ],

    //get the current time and add a random ints and strings of length 11 to itc
  const randomString = generateRandomString();
  //empty the held objects file
  //fs.writeFileSync(HELD_OBJECTS_FILE, JSON.stringify(heldObjects, null, 2));

  const currentTime = new Date().getTime();
  const traceId = currentTime + randomString;
  const ObjectKeys = Object.keys(holdTokens);

  await Promise.all(ObjectKeys.map(async (email) => {
    try {
      //console.log('email from release:', email);
      const token = holdTokens[email][0];
      //const response = await fetch(`https://api.seatcloud.com/adapter/sio/teams/66e63c10464382fb1f049832/events/${eventKey}/render/objects/held?hold_token=${token}&trace_id=${traceId}`, {
      const UpdateURL = `https://api.seatcloud.com/api/v2/${workspaceKey}/event/${eventKey}/items/held?hold_token=${token}&trace_id=${traceId}&plain=true`;

      const isAhlanByEnv = process.env.IS_AHLAN === 'true' || process.env.isAhlan === 'true';
      const isAhlanByPromptUrl = hasEventQueryParam(process.env.PROMPT_URL || '');
      const isAhlanByShape = Boolean(eventDetails && !eventDetails.data);
      const isAhlan = isAhlanByEnv || isAhlanByPromptUrl || isAhlanByShape;

      const fetchHeaders = {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9,ar;q=0.8,ar-IQ;q=0.7,de;q=0.6",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "Referer": "https://chart.seatcloud.com/",
        ...(process.env.USER_AGENT ? { 'user-agent': process.env.USER_AGENT } : {})
      };

      let response;
      if (isAhlan && process.env.USE_BROWSER_FOR_AHLAN === 'true') {
        console.log(`Fetching held objects via browser service for ${email}`);
        response = await browserFetch(UpdateURL, {
          method: 'GET',
          headers: fetchHeaders
        });
      } else {
        response = await fetch(UpdateURL, {
          "headers": fetchHeaders,
          "body": null,
          "method": "GET"
        });
      }
      const rawResonse = await response.text();
      //console.log('rawResonse',rawResonse);
      const responseJson = JSON.parse(rawResonse);
      if (!Array.isArray(responseJson)) {
        console.log(`API Error for ${email}:`, responseJson);
        return;
      }
      // check if the heldObjects[token] is not an array
      if (!(heldObjects[token])) {
        // if it's not an array, set it to an empty array
        heldObjects[token] = [];
      }
      for (const object of responseJson) {
        // add the object to the heldObjects[token] array
        heldObjects[token].push({ ...object, timestamp: currentTime, objectId: object.label });
        total_seats += 1;
      }
    } catch (err) {
      console.error(`Error updating held objects for ${email}:`, err);
    }
  }));

  console.log('total hold tokens are', Object.keys(holdTokens).length);


  }catch(err){
      console.log(err);
    }
      //console.log('heldObjects',JSON.stringify(heldObjects, null, 2));
  fs.writeFileSync(HELD_OBJECTS_FILE, JSON.stringify(heldObjects, null, 2));
    //console.log('held objects:',heldObjects,'total seats:',total_seats);
    console.log('held objects:','total seats:',total_seats);
}



function getValidHoldTokens() {
    try {
        if (fs.existsSync(HOLD_TOKENS_FILE)) {
            const data = fs.readFileSync(HOLD_TOKENS_FILE, 'utf-8');
            const holdTokensData = JSON.parse(data);
            const validTokens = new Set();
            for (const email in holdTokensData) {
                const tokens = holdTokensData[email];
                tokens.forEach(token => validTokens.add(token));
            }
            return validTokens;
        }
    } catch (error) {
        console.error('Could not read hold tokens file.', error);
    }
    return new Set();
}

function cleanupInvalidHeldObjects() {
    try {
        if (!fs.existsSync(HELD_OBJECTS_FILE)) {
            return;
        }
        const validTokens = getValidHoldTokens();
        const data = fs.readFileSync(HELD_OBJECTS_FILE, 'utf-8');
        const heldObjects = JSON.parse(data);
        let cleaned = false;

        for (const token in heldObjects) {
            if (!validTokens.has(token)) {
                console.log(`Removing objects with invalid hold token: ${token}`);
                delete heldObjects[token];
                cleaned = true;
            }
        }

        if (cleaned) {
            fs.writeFileSync(HELD_OBJECTS_FILE, JSON.stringify(heldObjects, null, 2));
            console.log('Cleaned up held_objects.json from invalid hold tokens.');
        }
    } catch (error) {
        console.error('Could not cleanup held objects file.', error);
    }
}

function showHeldObjects() {
    try {
        if (fs.existsSync(HELD_OBJECTS_FILE)) {
            const data = fs.readFileSync(HELD_OBJECTS_FILE, 'utf-8');
            const heldObjects = JSON.parse(data);
            const now = Date.now();
            const timeframe = 10 * 60 * 1000;
            const recentObjects = {};

            for (const token in heldObjects) {
                const objects = heldObjects[token].filter(obj => now - obj.timestamp <= timeframe);
                if (objects.length > 0) {
                    objects.sort((a, b) => a.objectId.localeCompare(b.objectId, undefined, { numeric: true }));
                    recentObjects[token] = objects;
                }
            }
            console.log(JSON.stringify(recentObjects, null, 2));
        } else {
            console.log('No held objects file found.');
        }
    } catch (error) {
        console.error('Could not read held objects file.', error);
    }
    process.exit(0);
}

if (import.meta.url === `file://${fs.realpathSync(process.argv[1])}`) {
    const argv = yargs(hideBin(process.argv))
        .option('show-held-objects', {
            alias: 's',
            type: 'boolean',
            description: 'Show all held objects'
        })
        .option('prefix', {
            alias: 'p',
            type: 'string',
            description: 'The prefix of the objects to release'
        })
        .option('quantity', {
            alias: 'q',
            type: 'number',
            description: 'The number of objects to release'
        })
        .option('token', {
            alias: 't',
            type: 'string',
            description: 'The hold token'
        })
        .option('new-token', {
            alias: 'n',
            type: 'string',
            description: 'The new hold token to transfer objects to'
        })
        .option('connect', {
            alias: 'c',
            type: 'string',
            description: 'Connect to socket with the given hold token'
        })
        .option('update', {
            alias: 'u',
            type: 'string',
            description: 'Connect to socket with the given hold token'
        })
        .help()
        .argv;

    if (argv.showHeldObjects) {
        showHeldObjects();
    }

    if (argv.connect) {
        const port = getSocketPort();
        const ws = new WebSocket(`ws://localhost:${port}`);
        ws.on('open', () => {
            ws.send(JSON.stringify({ action: 'connect', token: argv.connect }));
            console.log('Sent connect request for token:', argv.connect);
        });
        ws.on('message', (data) => {
            console.log('Received:', data.toString());
            ws.close();
            process.exit(0);
        });
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            process.exit(1);
        });
    } else if (argv.update) {
        await updateHeldObjectsFromAPI(argv.update);

    } else {

        const { prefix, quantity, token } = argv;

        if (!prefix || !quantity) {
            console.log('Usage: node release.js --prefix <prefix> -p <prefix> --quantity <quantity> -q <quantity> [--token <hold_token>] [--new-token <new_hold_token>]');
            console.log('Usage: node release.js --show-held-objects or -s');
            process.exit(1);
        }

        function getObjectsToRelease(prefix, quantity, token) {
            try {
                if (fs.existsSync(HELD_OBJECTS_FILE)) {
                    const data = fs.readFileSync(HELD_OBJECTS_FILE, 'utf-8');
                    const heldObjects = JSON.parse(data);
                    let allMatchingObjects = [];

                    if (token) {
                        const objectsForToken = heldObjects[token] || [];
                        allMatchingObjects = objectsForToken.filter(obj => obj.objectId.startsWith(prefix));
                    } else {
                        for (const t in heldObjects) {
                            const objectsForToken = heldObjects[t] || [];
                            const matchingObjects = objectsForToken.filter(obj => obj.objectId.startsWith(prefix));
                            allMatchingObjects.push(...matchingObjects.map(obj => ({ ...obj, token: t })));
                        }
                    }

                    allMatchingObjects.sort((a, b) => a.objectId.localeCompare(b.objectId, undefined, { numeric: true }));

                    return allMatchingObjects.slice(0, quantity);
                }
            } catch (error) {
                console.error('Could not read held objects file.', error);
            }
            return [];
        }

        // Clean up invalid hold tokens before processing transfer
        if (argv.newToken) {
            cleanupInvalidHeldObjects();
        }

        const objectsToRelease = getObjectsToRelease(prefix, quantity, token);

        if (objectsToRelease.length === 0) {
            console.log('No objects found to release with the specified prefix.');
            process.exit(0);
        }

        const objectsByToken = objectsToRelease.reduce((acc, obj) => {
            const token = obj.token || argv.token;
            if (!acc[token]) {
                acc[token] = [];
            }
            acc[token].push({ objectId: obj.objectId });
            return acc;
        }, {});

        const port = getSocketPort();
        const ws = new WebSocket(`ws://localhost:${port}`);

        ws.on('open', () => {
            for (const t in objectsByToken) {
                const action = argv.newToken ? 'transfer-object' : 'free-object';
                const message = {
                    action,
                    objects: objectsByToken[t],
                    token: t
                };
                if (argv.newToken) {
                    message.newToken = argv.newToken;
                }
                ws.send(JSON.stringify(message));
            }
        });

        ws.on('message', (data) => {
            console.log('Received:', data.toString());
            ws.close();
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }
}


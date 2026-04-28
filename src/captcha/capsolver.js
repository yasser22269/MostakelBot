import fetch from 'node-fetch';
import ac from '@antiadmin/anticaptchaofficial'
import 'dotenv/config';

// const CAPSOLVER_API_KEY = 'CAP-902B6B01CD4BFA6AAE1F11ED87E44547FB270F8260CF765556336378238FA353'; // Capsolver API Key provided by user
const CAPSOLVER_API_KEY = 'CAP-E151989255E21DD3A1F12B6DC33BEA3218E6729C855102F53DE92CCA88F5C908'; // Capsolver API Key provided by user

/**
 * Creates a reCAPTCHA v2 task with Capsolver.
 * @param {string} websiteURL - The URL of the page where the reCAPTCHA is located.
 * @param {string} websiteKey - The sitekey of the reCAPTCHA.
 * @returns {Promise<object>} - The response from Capsolver containing taskId.
 */
export async function createReCaptchaV2Task(websiteURL, websiteKey) {
    try {
        const response = await fetch('https://api.capsolver.com/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientKey: CAPSOLVER_API_KEY,
                task: {
                    type: "ReCaptchaV2TaskProxyLess", // Use ReCaptchaV2Task if you need to use a proxy
                    websiteURL: websiteURL,
                    websiteKey: websiteKey
                }
            })
        });
        const data = await response.json();
        if (data.errorId === 0) {
            // console.log('Capsolver task created successfully:', data.taskId);
            return data;
        } else {
            // console.error('Error creating Capsolver task:', data.errorId, data.errorDescription);
            throw new Error(data.errorDescription);
        }
    } catch (error) {
        // console.error('Network or other error while creating Capsolver task:', error);
        throw error;
    }
}

/**
 * Creates a reCAPTCHA v3 task with Capsolver.
 * @param {string} websiteURL - The URL of the page where the reCAPTCHA is located.
 * @param {string} websiteKey - The sitekey of the reCAPTCHA.
 * @param {string} pageAction - The action name for reCAPTCHA v3.
 * @param {number} minScore - The minimum score for reCAPTCHA v3 (e.g., 0.3).
 * @returns {Promise<object>} - The response from Capsolver containing taskId.
 */
export async function createReCaptchaV3Task(websiteURL, websiteKey, pageAction, minScore,proxy =null) {
    console.log({minScore});
    
    try {
        const proxy_c =proxy?  `https:${proxy.host}:${proxy.port}:${proxy.user}:${proxy.pass}`: null;
        console.log({proxy_c});
        
        const response = await fetch('https://api.capsolver.com/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientKey: CAPSOLVER_API_KEY,
                task: {
                    type: "ReCaptchaV3TaskProxyLess", // Use ReCaptchaV3Task if you need to use a proxy
                    websiteURL: websiteURL,
                    websiteKey: websiteKey,
                    pageAction: pageAction,
                    minScore: minScore,
                    // "proxy": "http:ip:port:user:pass", // socks5:ip:port:user:pass, Optional
                    proxy:proxy_c
                }
            })
        });
        const data = await response.json();
        if (data.errorId === 0) {
            // console.log('Capsolver reCAPTCHA v3 task created successfully:', data.taskId);
            return data;
        } else {
            // console.error('Error creating Capsolver reCAPTCHA v3 task:', data.errorId, data.errorDescription);
            throw new Error(data.errorDescription);
        }
    } catch (error) {
        // console.error('Network or other error while creating Capsolver reCAPTCHA v3 task:', error);
        throw error;
    }
}
export async function createTurnstileTask(websiteURL, websiteKey) {
    try {
        const response = await fetch('https://api.capsolver.com/createTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
// {
//   "clientKey": "YOUR_API_KEY",
//   "task": {
//     "type": "AntiTurnstileTaskProxyLess",
//     "websiteURL": "https://www.yourwebsite.com",
//     "websiteKey": "0x4XXXXXXXXXXXXXXXXX",
//     "metadata": {
//        "action": "login",  //optional
//        "cdata": "0000-1111-2222-3333-example-cdata"  //optional
//     }
//   }
// }
            body: JSON.stringify({
                clientKey: CAPSOLVER_API_KEY,
                task: {
                    type: "AntiTurnstileTaskProxyLess", 
                    websiteURL: websiteURL,
                    websiteKey: websiteKey,
                    metadata: {
                        
                    }
                }
            })
        });
        const data = await response.json();
        if (data.errorId === 0) {
            // console.log('Capsolver reCAPTCHA v3 task created successfully:', data.taskId);
            return data;
        } else {
            // console.error('Error creating Capsolver reCAPTCHA v3 task:', data.errorId, data.errorDescription);
            throw new Error(data.errorDescription);
        }
    } catch (error) {
        // console.error('Network or other error while creating Capsolver reCAPTCHA v3 task:', error);
        throw error;
    }
}

/**
 * Retrieves the result of a Capsolver task.
 * @param {string} taskId - The ID of the task obtained from createTask.
 * @returns {Promise<object>} - The response from Capsolver containing the solution.
 */
export async function getCapsolverTaskResult(taskId) {
    try {
        let retries = 0;
        const maxRetries = 50; // Adjust as needed
        const delay = 1000; // 5 seconds

        while (retries < maxRetries) {
            const response = await fetch('https://api.capsolver.com/getTaskResult', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientKey: CAPSOLVER_API_KEY,
                    taskId: taskId
                })
            });
            const data = await response.json();

            if (data.errorId === 0) {
                if (data.status === 'ready') {
                    // console.log('Capsolver task result ready:', data.solution);
                    return data;
                } else if (data.status === 'processing') {
                    // console.log('Capsolver task still processing. Retrying in', delay / 1000, 'seconds...');
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                } else {
                    // console.error('Capsolver task status:', data.status, data.errorDescription);
                    throw new Error(`Capsolver task failed with status: ${data.status}`);
                }
            } else {
                // console.error('Error getting Capsolver task result:', data.errorId, data.errorDescription);
                throw new Error(data.errorDescription);
            }
        }
        throw new Error('Max retries reached for Capsolver task result.');
    } catch (error) {
        // console.error('Network or other error while getting Capsolver task result:', error);
        throw error;
    }
}

// Example Usage (for demonstration, you would integrate this into your botindex.js or main.js)
/*
(async () => {
    const websiteURL = 'https://www.example.com/recaptcha-page'; // Replace with the actual URL
    const websiteKey = 'YOUR_RECAPTCHA_SITE_KEY'; // Replace with the actual site key

    try {
        console.log('Attempting to solve reCAPTCHA v2...');
        const createTaskResponse = await createReCaptchaV2Task(websiteURL, websiteKey);
        if (createTaskResponse && createTaskResponse.taskId) {
            const taskId = createTaskResponse.taskId;
            console.log('Task ID:', taskId);

            const getResultResponse = await getCapsolverTaskResult(taskId);
            if (getResultResponse && getResultResponse.solution && getResultResponse.solution.gRecaptchaResponse) {
                const gRecaptchaResponse = getResultResponse.solution.gRecaptchaResponse;
                console.log('reCAPTCHA v2 Token:', gRecaptchaResponse);
                // Now you can use this token in your form submission or API request
            } else {
                console.error('Failed to get reCAPTCHA v2 token.');
            }
        }
    } catch (error) {
        console.error('An error occurred during reCAPTCHA solving process:', error);
    }
})();
*/
export async function solveTurnstileAntiCaptcha(websiteURL, websiteKey, action, cdata) {
    try {
        //npm install @antiadmin/anticaptchaofficial
        //https://github.com/anti-captcha/anticaptcha-npm
        ac.setAPIKey(process.env.ANTICAPTCHA_API_KEY);
        //Specify softId to earn 10% commission with your app.
        //Get your softId here: https://anti-captcha.com/clients/tools/devcenter
        // ac.setSoftId(0);
        return await ac.solveTurnstileProxyless(websiteURL, websiteKey, action, cdata);
    } catch (error) {
        console.log(error);
        throw error;
    }
}
export async function solveV3AntiCaptcha(websiteURL, websiteKey, pageAction, minScore) {
  let isError = true;
  let retryCount = 0;
  const maxRetries = 5;
  let result = null;
  //ac.setAPIKey('b36a3ddb7800e75a1d6046981509e6e0');
  ac.setAPIKey(process.env.ANTICAPTCHA_API_KEY);
  while(isError && retryCount < maxRetries){
    try {
        result=  await  ac.solveRecaptchaV3(websiteURL,
        websiteKey  ,
            minScore, //minimum score required: 0.3, 0.7 or 0.9
        pageAction)
        isError = false;

    } catch (error) {
        console.log(`error solving v3 (retry ${retryCount + 1}/${maxRetries}):`, error.message || error);
        retryCount++;
    }
  }
    return result;
}

/**
 * Unified function to solve Turnstile CAPTCHA using localhost:5000 API
 * @param {string} websiteURL - The target URL containing the CAPTCHA
 * @param {string} sitekey - The site key for the CAPTCHA
 * @param {string} [action] - Action to trigger during CAPTCHA solving (optional)
 * @param {string} [cdata] - Custom data for additional CAPTCHA parameters (optional)
 * @returns {Promise<string>} - The CAPTCHA solution token
 */
//const localHostAddress = 'https://mac-mini.tail505e1.ts.net/capsolver';
const localHostAddress =process.env.LOCAL_CAPTCHA_URL;
export async function solveV3Local( sitekey,  websiteURL,pageAction,minScore) {
    try {
        //example http://127.0.0.1:5000/recaptchav3?sitekey=6Lf7x-8qAAAAACTG6gffMEWoXQoQhKS6UWTkG9cD&action=homepage&url=https://api.seatcloud.com
        const createUrl = new URL(`${localHostAddress}/recaptchav3`);


        createUrl.searchParams.append('sitekey', sitekey);
        createUrl.searchParams.append('url', websiteURL);
        createUrl.searchParams.append('pageAction', pageAction);
        createUrl.searchParams.append('minScore', minScore);


      console.log('the url for solving v3 is',createUrl.toString());
        
        const createResponse = await fetch(createUrl.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
        }

        const createData = await createResponse.json();
        
        if (!createData.task_id) {
            throw new Error('No task_id returned from localhost:5001');
        }

        console.log(`Task created successfully with ID: ${createData.task_id}`);

        // Poll for the result
        const getResultUrl = new URL(`${localHostAddress}/result`);
        getResultUrl.searchParams.append('id', createData.task_id);

        let retries = 0;
        const maxRetries = 120; // 2 minutes with 1-second intervals
        const pollInterval = 1000; // 1 second

        while (retries < maxRetries) {
            const resultResponse = await fetch(getResultUrl.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!resultResponse.ok) {
                throw new Error(`Failed to get result: ${resultResponse.status} ${resultResponse.statusText}`);
            }

            const resultData = await resultResponse.json();
          //console.log('got result data',resultData);

            if (resultData?.data?.value) {
                console.log(`CAPTCHA solved successfully! Elapsed time: ${resultData?.data?.elapsed_time}s`);
                return resultData?.data?.value;
            } else if (resultData?.error) {
                throw new Error(`CAPTCHA solving failed: ${resultData?.error}`);
            } else {
                // Still processing, wait and retry
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                retries++;
            }
        }

        throw new Error('Max retries reached while waiting for CAPTCHA solution');
        
    } catch (error) {
        console.error('Error solving Turnstile CAPTCHA:', error);
        throw error;
    }
}
export async function solveTurnstileLocal(websiteURL, sitekey, action, cdata) {
    try {
        // First, create the task
        const createUrl = new URL(`${localHostAddress}/turnstile`);
        createUrl.searchParams.append('url', websiteURL);
        createUrl.searchParams.append('sitekey', sitekey);
        if (action) createUrl.searchParams.append('action', action);
        if (cdata) createUrl.searchParams.append('cdata', cdata);

        console.log(`Creating Turnstile task for ${websiteURL} with sitekey ${sitekey}`);
        
        const createResponse = await fetch(createUrl.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
        }

        const createData = await createResponse.json();
        
        if (!createData.task_id) {
            throw new Error('No task_id returned from localHostAddress');
        }

        console.log(`Task created successfully with ID: ${createData.task_id}`);

        // Poll for the result
        const getResultUrl = new URL(`${localHostAddress}/result`);
        getResultUrl.searchParams.append('id', createData.task_id);

        let retries = 0;
        const maxRetries = 120; // 2 minutes with 1-second intervals
        const pollInterval = 1000; // 1 second

        while (retries < maxRetries) {
            const resultResponse = await fetch(getResultUrl.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!resultResponse.ok) {
                throw new Error(`Failed to get result: ${resultResponse.status} ${resultResponse.statusText}`);
            }

          let resultData ={};
          try{
            

            resultData = await resultResponse.json();
          } catch (error) {
            //console.log(error);
          }

            if (resultData?.data?.value) {
                console.log(`CAPTCHA solved successfully! Elapsed time: ${resultData.data.elapsed_time}s`);
                return resultData?.data?.value;
            } else if (resultData?.error) {
                throw new Error(`CAPTCHA solving failed: ${resultData.error}`);
            } else {
                // Still processing, wait and retry
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                retries++;
            }
        }

        throw new Error('Max retries reached while waiting for CAPTCHA solution');
        
    } catch (error) {
        console.error('Error solving Turnstile CAPTCHA:', error);
        throw error;
    }
}

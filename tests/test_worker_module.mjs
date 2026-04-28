import { Worker } from 'worker_threads';

const w = new Worker('./src/bot/worker.js', {
    workerData: {
        account: 'test@test.com:pass:token',
        freeSeatsBatch: [],
        isSeason: false,
        botVersion: 'v3',
        renderingInfo: {},
        publishedDetails: {},
        objectStatuses: [],
        eventDetails: {},
        holdToken: 'test',
        chartToken: 'test',
        proxy: null,
        url: 'test',
        usePreparedAccessTokens: false,
        blockName: '',
        chartKey: 'test',
        eventId: 'test',
        workspaceKey: 'test',
        browserId: 'test',
        isGeneralAdmissionAreas: false,
        eventKey: 'test',
        channelKeysToCheck: [],
    }
});
w.on('error', e => { console.error('WORKER ERROR:', e.message, '\nCode:', e.code, '\nStack:', e.stack?.split('\n').slice(0,5).join('\n')); process.exit(0); });
w.on('exit', code => { console.log('Worker exited with code:', code); process.exit(0); });
setTimeout(() => { console.log('Timeout'); process.exit(0); }, 8000);

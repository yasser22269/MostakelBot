const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startBot: (options) => ipcRenderer.send('start-bot', options),
    stopBot: () => ipcRenderer.send('stop-bot'),
    onBotLog: (callback) => ipcRenderer.on('bot-log', (_event, log) => callback(log)),
    onBotStopped: (callback) => ipcRenderer.on('bot-stopped', () => callback()),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, status) => callback(status)),
    getSorFiles: () => ipcRenderer.send('get-sor-files'),
    onSorFiles: (callback) => ipcRenderer.on('sor-files', (_event, files) => callback(files)),
    readFile: (fileName) => ipcRenderer.send('read-file', fileName),
    onFileContent: (callback) => ipcRenderer.on('file-content', (_event, content) => callback(content)),
    saveFile: (file) => ipcRenderer.send('save-file', file),
    prepareAccessToken: () => ipcRenderer.send('prepare-access-token'),
    prepareBookingInfo: (options) => ipcRenderer.send('prepare-booking-info', options),
    fetchHoldTokens: () => ipcRenderer.send('fetch-hold-tokens')
});

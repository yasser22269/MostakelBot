const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const colors = require('colors');
const AnsiToHtml = require('ansi-to-html');
const ansiToHtml = new AnsiToHtml();

let mainWindow;
let botProcess;

function createWindow() {
  nativeTheme.themeSource = 'dark';
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#121212',
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#121212',
      symbolColor: '#e0e0e0',
      height: 30
    },
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('get-sor-files', (event) => {
     const DATA_DIR = process.env.DATA_DIR || 'data';
     const sorPath = path.join(__dirname, DATA_DIR, 'sor');
     fs.readdir(sorPath, (err, files) => {
        if (err) {
            console.error(colors.red('Failed to read sor directory:'), err);
            return;
        }
        mainWindow.webContents.send('sor-files', files);
    });
});

ipcMain.on('read-file', (event, fileName) => {
     const DATA_DIR = process.env.DATA_DIR || 'data';
     const filePath = path.join(__dirname, DATA_DIR, 'sor', fileName);
     fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(colors.red(`Failed to read file ${fileName}:`), err);
            return;
        }
        mainWindow.webContents.send('file-content', data);
    });
});

ipcMain.on('save-file', (event, { fileName, content }) => {
     const DATA_DIR = process.env.DATA_DIR || 'data';
     const filePath = path.join(__dirname, DATA_DIR, 'sor', fileName);
     fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
            console.error(colors.red(`Failed to save file ${fileName}:`), err);
            return;
        }
        console.log(colors.green(`File ${fileName} saved successfully.`));
    });
});

ipcMain.on('start-bot', (event, { threads, tickets, eventUrl, blockName, botVersion }) => {
  if (botProcess) {
    console.log(colors.yellow('Bot is already running.'));
    return;
  }

  console.log(colors.green(`Starting bot with ${threads} threads, ${tickets} tickets for URL: ${eventUrl}, Block Name: ${blockName}`));
  
  const botPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'src', 'botindex.js')
    : path.join(__dirname, 'src', 'botindex.js');

  botProcess = fork(botPath, [], {
    env: {
      ...process.env,
      THREADS: threads,
      TICKET_PER_ACCOUNT: tickets,
      PROMPT_URL: eventUrl,
      BLOCK_NAME: blockName,
      BOT_VERSION: botVersion,
    },
    silent: true,
  });

  botProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  botProcess.on('message', (message) => {
    if (message.type === 'statusUpdate') {
      mainWindow.webContents.send('update-status', message.data);
    }
  });

  botProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  botProcess.on('close', (code) => {
    console.log(colors.yellow(`Bot process exited with code ${code}`));
    mainWindow.webContents.send('bot-stopped');
    botProcess = null;
  });
});

ipcMain.on('stop-bot', () => {
  if (botProcess) {
    console.log(colors.red('Stopping bot...'));
    botProcess.kill();
    botProcess = null;
    mainWindow.webContents.send('bot-stopped');
  }
});

ipcMain.on('fetch-hold-tokens', () => {
  console.log(colors.green('Fetching hold tokens...'));
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'scripts', 'prepare_hold_token.js')
    : path.join(__dirname, 'scripts', 'prepare_hold_token.js');

  const fetchProcess = fork(scriptPath, [], {
    env: {
      ...process.env,
      ACTION: 'fetchHoldTokens',
    },
    silent: true,
  });

  fetchProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  fetchProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  fetchProcess.on('close', (code) => {
    console.log(colors.yellow(`Fetch hold tokens process exited with code ${code}`));
    mainWindow.webContents.send('bot-log', { message: `Fetch hold tokens process exited with code ${code}` });
  });
});

ipcMain.on('prepare-access-token', (event ) => {
  console.log(colors.green(`Preparing access token for block: ...`));
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'scripts', 'prepare_access_token.js')
    : path.join(__dirname, 'scripts', 'prepare_access_token.js');

  const prepareProcess = fork(scriptPath, [], {
    env: {
      ...process.env
      // BLOCK_NAME: blockName,
    },
    silent: true,
  });

  prepareProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  prepareProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  prepareProcess.on('close', (code) => {
    console.log(colors.yellow(`Prepare access token process exited with code ${code}`));
    mainWindow.webContents.send('bot-log', { message: `Prepare access token process exited with code ${code}` });
  });
});

ipcMain.on('prepare-booking-info', (event, { botVersion, eventUrl }) => {
  console.log(colors.green('Preparing booking info...'));
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'scripts', 'prepare_booking_info.js')
    : path.join(__dirname, 'scripts', 'prepare_booking_info.js');

  const prepareProcess = fork(scriptPath, [], {
    env: {
      ...process.env,
      BOT_VERSION: botVersion,
      PROMPT_URL: eventUrl,
    },
    silent: true,
  });

  prepareProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  prepareProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('bot-log', { message: ansiToHtml.toHtml(data.toString()) });
  });

  prepareProcess.on('close', (code) => {
    console.log(colors.yellow(`Prepare booking info process exited with code ${code}`));
    mainWindow.webContents.send('bot-log', { message: `Prepare booking info process exited with code ${code}` });
  });
});

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const threadsInput = document.getElementById('threads');
const ticketsInput = document.getElementById('tickets');
const eventUrlInput = document.getElementById('eventUrl');
const blockNameInput = document.getElementById('blockName');
const logContainer = document.getElementById('logs');
const botVersionSelect = document.getElementById('botVersion');
const heldSeatsEl = document.getElementById('held-seats');
const processedAccountsEl = document.getElementById('processed-accounts');
const fileSelector = document.getElementById('file-selector');
const saveFileBtn = document.getElementById('save-file-btn');
const fileContent = document.getElementById('file-content');
const prepareAccessTokenBtn = document.getElementById('prepare-access-token-btn');
const fetchHoldTokenBtn = document.getElementById('fetch-hold-token-btn');
const prepareBookingInfoBtn = document.getElementById('prepare-booking-info-btn');

document.addEventListener('DOMContentLoaded', () => {
    window.electronAPI.getSorFiles();
});

prepareAccessTokenBtn.addEventListener('click', () => {
    const blockName = blockNameInput.value;
    window.electronAPI.prepareAccessToken({ blockName });
});

fetchHoldTokenBtn.addEventListener('click', () => {
    window.electronAPI.fetchHoldTokens();
});

prepareBookingInfoBtn.addEventListener('click', () => {
    const botVersion = botVersionSelect.value;
    const eventUrl = eventUrlInput.value;
    window.electronAPI.prepareBookingInfo({ botVersion, eventUrl });
});

startBtn.addEventListener('click', () => {
    const threads = threadsInput.value;
    const tickets = ticketsInput.value;
    const eventUrl = eventUrlInput.value;
    const blockName = blockNameInput.value;
    const botVersion = botVersionSelect.value;
    window.electronAPI.startBot({ threads, tickets, eventUrl, blockName, botVersion });
    startBtn.disabled = true;
    stopBtn.disabled = false;
});

stopBtn.addEventListener('click', () => {
    window.electronAPI.stopBot();
});

fileSelector.addEventListener('change', () => {
    const selectedFile = fileSelector.value;
    if (selectedFile) {
        window.electronAPI.readFile(selectedFile);
    }
});

saveFileBtn.addEventListener('click', () => {
    const selectedFile = fileSelector.value;
    const content = fileContent.value;
    if (selectedFile) {
        window.electronAPI.saveFile({ fileName: selectedFile, content });
    }
});

window.electronAPI.onBotLog((log) => {
    const logElement = document.createElement('div');
    logElement.innerHTML = log.message;
    logContainer.appendChild(logElement);
    logContainer.scrollTop = logContainer.scrollHeight;
});

window.electronAPI.onBotStopped(() => {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    const logElement = document.createElement('div');
    logElement.textContent = 'Bot stopped.';
    logContainer.appendChild(logElement);
    logContainer.scrollTop = logContainer.scrollHeight;
});

window.electronAPI.onUpdateStatus((status) => {
    heldSeatsEl.textContent = `Held Seats: ${status.heldSeats}`;
    processedAccountsEl.textContent = `Processed Accounts: ${status.processedAccounts}`;
});

window.electronAPI.onSorFiles((files) => {
    fileSelector.innerHTML = '';
    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        fileSelector.appendChild(option);
    });
    // Automatically load the first file if available
    if (files.length > 0) {
        fileSelector.value = files[0];
        window.electronAPI.readFile(files[0]);
    }
});

window.electronAPI.onFileContent((content) => {
    fileContent.value = content;
});

const tabs = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = document.getElementById(tab.dataset.tab);

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        tabContents.forEach(c => c.classList.remove('active'));
        target.classList.add('active');

        if (target.id === 'file-editor') {
            target.style.display = 'flex';
        } else {
            document.getElementById('file-editor').style.display = 'none';
        }
    });
});

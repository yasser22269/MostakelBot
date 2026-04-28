import fs from 'fs';

function cleanEmails() {
    const replacedAccounts = fs.readFileSync('../../data/replaced_accs.txt', 'utf-8').split('\n').filter(Boolean);
    let cleanedAccounts = '';

    for (const accountLine of replacedAccounts) {
        const [account1Email, account1Pass, account2Email, account2Pass] = accountLine.split(':');
        cleanedAccounts += `${account2Email}:${account1Pass}\n`;
    }

    fs.writeFileSync('../../data/cleaned_changed_emails.txt', cleanedAccounts);
}

cleanEmails();
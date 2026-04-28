const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const obfuscateFile = (filePath) => {
    console.log(`Obfuscating: ${filePath}`);
    try {
        const sourceCode = fs.readFileSync(filePath, 'utf8');
        const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 1,
            debugProtection: true,
            debugProtectionInterval: 4000,
            disableConsoleOutput: false,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: true,
            selfDefending: true,
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 5,
            stringArray: true,
            stringArrayEncoding: ['rc4'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 5,
            stringArrayWrappersType: 'function',
            stringArrayWrappersParametersMaxCount: 5,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
            target: 'node',
            forceTransformStrings: []
        });
        fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode());
        console.log(`Successfully obfuscated and replaced: ${filePath}`);
    } catch (err) {
        console.error(`Error obfuscating ${filePath}:`, err.message);
    }
};

const main = () => {
    let files = glob.sync('bundled/**/*.{js,cjs}');
    // there is a file named config.js that we don't want to obfuscate filter it
    files = files.filter(file => !file.includes('config.js'));
    files.forEach(obfuscateFile);
};

main();
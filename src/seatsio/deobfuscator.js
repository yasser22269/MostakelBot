// const pako = require('pako'); // Assuming pako is installed via npm or available globally
import pako from 'pako';

// Convert key to a number between 0 and 63
function getKeyAsInt(key) {
    return getHashValue(key) & 63;
}

// Hash function to calculate a numeric value from the key
function getHashValue(str) {
    let hashcode = 0;
    const mod = 10007;
    const shift = 29;
    for (let i = 0; i < str.length; i++) {
        hashcode = (((shift * hashcode) % mod) + str.charCodeAt(i)) % mod;
    }
    return hashcode;
}

// Deobfuscate function that works with Uint8Array directly
 async function getUnscrambleData(scrambledData, key, isObfuscated = true) {
    try {
        // Check if the input is gzipped (magic number 0x1f 0x8b)
        let decompressed;
        if (scrambledData.length >= 2 && scrambledData[0] === 0x1f && scrambledData[1] === 0x8b) {
            // Decompress using pako (gzip implementation)
            decompressed = pako.inflate(scrambledData);
        } else {
            decompressed = scrambledData;
        }

        let result;
        if (isObfuscated) {
            // Get key as integer
            const keyAsInt = getKeyAsInt(key);
            // Deobfuscate by subtracting key from each byte
            result = new Uint8Array(decompressed.length);
            for (let i = 0; i < decompressed.length; i++) {
                result[i] = decompressed[i] - keyAsInt;
            }
        } else {
            result = decompressed;
        }

        // Convert to string
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(result);
    } catch (error) {
        throw new Error(`Deobfuscation failed: ${error.message}`);
    }
}

async function getUnscrambleDataOld(bytes, key, isObfuscated = true) {
    try {
        let deobfuscated;
        if (isObfuscated) {
            // Get key as integer
            const keyAsInt = getKeyAsInt(key);
            // Deobfuscate by subtracting key from each byte
            deobfuscated = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) {
                deobfuscated[i] = bytes[i] - keyAsInt;
            }
        } else {
            deobfuscated = bytes;
        }

        // Check if the result is gzipped (magic number 0x1f 0x8b)
        if (deobfuscated.length >= 2 && deobfuscated[0] === 0x1f && deobfuscated[1] === 0x8b) {
            // Decompress using pako (gzip implementation)
            const decompressed = pako.inflate(deobfuscated);
            // Convert to string
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(decompressed);
        } else {
            // If not gzipped, just return as string
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(deobfuscated);
        }
    } catch (error) {
        throw new Error(`Deobfuscation failed: ${error.message}`);
    }
}

 export {
    getKeyAsInt,
    getHashValue,
    getUnscrambleData,
    getUnscrambleDataOld,
};
// --- Usage Example ---
async function runExample() {
    const secretKey = "mySuperSecretKey";
    const originalData = "This is a secret message that needs to be protected!";

    console.log("Original Data:", originalData);

    // --- Scenario 1: Obfuscate then Gzip (simulating getUnscrambleDataOld) ---
    // 1. Obfuscate
    const keyAsIntOld = getKeyAsInt(secretKey);
    const obfuscatedBytesOld = new Uint8Array(originalData.length);
    for (let i = 0; i < originalData.length; i++) {
        obfuscatedBytesOld[i] = originalData.charCodeAt(i) + keyAsIntOld;
    }

    // 2. Gzip the obfuscated data
    const gzippedObfuscatedData = pako.gzip(obfuscatedBytesOld);

    console.log("\n--- Scenario 1: Obfuscate then Gzip (using getUnscrambleDataOld) ---");
    try {
        const deobfuscatedOld = await getUnscrambleDataOld(gzippedObfuscatedData, secretKey, true);
        console.log("Deobfuscated (Old Method):", deobfuscatedOld);
        console.log("Match original data:", deobfuscatedOld === originalData);
    } catch (error) {
        console.error("Deobfuscation (Old Method) failed:", error.message);
    }

    // --- Scenario 2: Gzip then Obfuscate (simulating getUnscrambleData) ---
    // 1. Gzip the original data
    const gzippedOriginalData = pako.gzip(originalData);

    // 2. Obfuscate the gzipped data
    const keyAsIntNew = getKeyAsInt(secretKey);
    const obfuscatedGzippedData = new Uint8Array(gzippedOriginalData.length);
    for (let i = 0; i < gzippedOriginalData.length; i++) {
        obfuscatedGzippedData[i] = gzippedOriginalData[i] + keyAsIntNew;
    }

    console.log("\n--- Scenario 2: Gzip then Obfuscate (using getUnscrambleData) ---");
    try {
        const deobfuscatedNew = await getUnscrambleData(obfuscatedGzippedData, secretKey, true);
        console.log("Deobfuscated (New Method):", deobfuscatedNew);
        console.log("Match original data:", deobfuscatedNew === originalData);
    } catch (error) {
        console.error("Deobfuscation (New Method) failed:", error.message);
    }

    // --- Scenario 3: Only Gzip (isObfuscated = false) ---
    console.log("\n--- Scenario 3: Only Gzip (using getUnscrambleData with isObfuscated = false) ---");
    try {
        const onlyGzippedData = pako.gzip(originalData);
        const decompressedOnly = await getUnscrambleData(onlyGzippedData, secretKey, false);
        console.log("Decompressed (Only Gzip):", decompressedOnly);
        console.log("Match original data:", decompressedOnly === originalData);
    } catch (error) {
        console.error("Decompression (Only Gzip) failed:", error.error);
    }
}


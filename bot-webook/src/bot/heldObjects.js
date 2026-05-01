import fs from 'fs';
import { log } from '../utils/utils.js';
import { FILE_PATHS } from '../utils/config.js';

const HELD_OBJECTS_FILE = FILE_PATHS.HELD_OBJECTS_FILE;

let heldObjects = {};

function loadHeldObjects() {
    try {
        if (fs.existsSync(HELD_OBJECTS_FILE)) {
            const data = fs.readFileSync(HELD_OBJECTS_FILE, 'utf-8');
            heldObjects = JSON.parse(data);
            log('info', 'Loaded held objects from file.');
        }
    } catch (error) {
        log('error', 'Could not load held objects from file.', error);
    }
}

function saveHeldObjects() {
    try {
        fs.writeFileSync(HELD_OBJECTS_FILE, JSON.stringify(heldObjects, null, 2));
    } catch (error) {
        log('error', 'Could not save held objects to file.', error);
    }
}

function addHeldObject(holdToken, objectId) {
    // Remove the object if it's already held by another token
    for (const token in heldObjects) {
        heldObjects[token] = heldObjects[token].filter(obj => obj.objectId !== objectId);
    }

    if (!heldObjects[holdToken]) {
        heldObjects[holdToken] = [];
    }
    heldObjects[holdToken].push({
        objectId,
        timestamp: Date.now()
    });
    saveHeldObjects();
}

function getHeldObjects(holdToken) {
    return heldObjects[holdToken] || [];
}

function removeHeldObject(holdToken, objectId) {
    if (heldObjects[holdToken]) {
        heldObjects[holdToken] = heldObjects[holdToken].filter(obj => obj.objectId !== objectId);
        saveHeldObjects();
    }
}

function getHeldObjectsWithinTimeframe(minutes = 10) {
    const now = Date.now();
    const timeframe = minutes * 60 * 1000;
    const recentObjects = {};

    for (const account in heldObjects) {
        const objects = heldObjects[account].filter(obj => now - obj.timestamp <= timeframe);
        if (objects.length > 0) {
            recentObjects[account] = objects;
        }
    }
    return recentObjects;
}

function getAllHeldObjects() {
    return getHeldObjectsWithinTimeframe();
}

loadHeldObjects();

export {
    addHeldObject,
    getHeldObjects,
    removeHeldObject,
    getAllHeldObjects,
    getHeldObjectsWithinTimeframe
};

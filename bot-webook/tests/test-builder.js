const fs = require('fs');
const { constructBookedSeatObject } = require('./create_booked_seat_object_v1.js');

// Load the data from the JSON files
const renderingInfo = JSON.parse(fs.readFileSync('sor/renderingInfo.json', 'utf8'));
const publishedDetails = JSON.parse(fs.readFileSync('sor/published.json', 'utf8'));
const objectStatuses = JSON.parse(fs.readFileSync('sor/objectStatuses.json', 'utf8'));
const eventDetails = JSON.parse(fs.readFileSync('sor/eventDetails.json', 'utf8'));

const objectLabel = "321-22-10";

const bookedSeat = constructBookedSeatObject(objectLabel, renderingInfo, publishedDetails, objectStatuses, eventDetails);

console.log(JSON.stringify(bookedSeat, null, 4));
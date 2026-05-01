import { createBookedSeatObject_section } from './create_booked_seat_object.js';
import fs from 'fs';

const objectStatuses = JSON.parse(fs.readFileSync('./sor/object_statuses_decoded.json'));
const publishedDetails = JSON.parse(fs.readFileSync('./sor/published.json'));
const renderingInfo = JSON.parse(fs.readFileSync('./sor/renderingInfo.json'));
const eventDetails = JSON.parse(fs.readFileSync('./sor/eventDetails.json'));

if (!renderingInfo || !publishedDetails || !objectStatuses || !eventDetails) {
    console.error('Rendering info, published details, object statuses, or event details not found.');
    process.exit(1);
}
const obj = '324-25-28'
const [section, parent, own] = obj.split('-');
// const own = '17';
// const parent = 'S';
// const section = 'N8';

const bookedSeat = createBookedSeatObject_section(own, parent, section, renderingInfo, publishedDetails, objectStatuses, eventDetails,'420d7e46-96e5-4a73-88e8-352be5c0ee27', '8c5bf9e2-d531-4f6f-9f9b-9983948f77d7');

// write to generated_booked_seat_object.json
fs.writeFileSync('./sor/generated_booked_seat_object.json', JSON.stringify(bookedSeat, null, 4));
console.log('done writing to file');
// console.log(JSON.stringify(bookedSeat, null, 4));
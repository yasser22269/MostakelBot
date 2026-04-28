const fs = require('fs');
const path = require('path');

const eventDetailsPath = path.join(process.cwd(), 'data/sor/eventDetails.json');
const publishedPath = path.join(process.cwd(), 'data/sor/published.json');

/**
 * Extracts prices for each section by mapping published.json sections
 * to eventDetails.json ticket prices via the specification key.
 */
function extractPrices() {
    const PRICE_LIMIT = 212; // Exclude prices >= this value
    console.log(`Reading files (Excluding prices >= ${PRICE_LIMIT})...`);

    try {
        if (!fs.existsSync(eventDetailsPath)) {
            throw new Error(`File not found: ${eventDetailsPath}`);
        }
        if (!fs.existsSync(publishedPath)) {
            throw new Error(`File not found: ${publishedPath}`);
        }

        const eventDetails = JSON.parse(fs.readFileSync(eventDetailsPath, 'utf8'));
        const published = JSON.parse(fs.readFileSync(publishedPath, 'utf8'));

        // Map seats_io_category (string) to price (number)
        const priceMap = {};
        if (eventDetails.data && eventDetails.data.event_tickets) {
            eventDetails.data.event_tickets.forEach(ticket => {
                const catId = ticket.seats_io_category;
                if (catId) {
                    priceMap[catId] = {
                        price: ticket.price,
                        vat: ticket.vat,
                        total: ticket.price + (ticket.vat || 0),
                        title: ticket.title
                    };
                }
            });
        }

        // Map sections to their prices
        let allSections = [];
        if (published.sections && Array.isArray(published.sections)) {
            published.sections.forEach(section => {
                const key = section.specification ? String(section.specification.key) : null;
                const priceInfo = key ? priceMap[key] : null;

                allSections.push({
                    section_name: section.name,
                    category_label: section.specification ? section.specification.label : 'N/A',
                    price: priceInfo ? priceInfo.price : 'N/A',
                    vat: priceInfo ? priceInfo.vat : 'N/A',
                    total_price: priceInfo ? priceInfo.total : 'N/A'
                });
            });
        }

        // Filter and collect summaries
        const results = [];
        const includedNames = [];
        const excludedNames = [];

        allSections.forEach(s => {
            // Convert section name to number if possible to avoid quotes in JSON
            const nameAsNum = isNaN(s.section_name) ? s.section_name : Number(s.section_name);

            // Logic for included/excluded lists
            if (s.total_price === 'N/A' || s.total_price >= PRICE_LIMIT) {
                excludedNames.push(nameAsNum);
            } else {
                includedNames.push(nameAsNum);
            }

            // Add ALL sections to the results array
            results.push(s);
        });

        // Sort by total_price from low to high
        results.sort((a, b) => {
            const priceA = a.total_price === 'N/A' ? Infinity : a.total_price;
            const priceB = b.total_price === 'N/A' ? Infinity : b.total_price;
            return priceA - priceB;
        });

        const output = {
            sections: results,
            included: includedNames,
            excluded: excludedNames
        };

        const outputPath = path.join(process.cwd(), 'data/sor/section_prices.json');

        // Manual formatting to keep included/excluded as strings without quotes and spaces
        let jsonString = JSON.stringify(output, null, 2);

        // Collapse included/excluded arrays into comma-separated strings without quotes or spaces
        jsonString = jsonString.replace(/"(included|excluded)":\s*\[\s*([\s\S]*?)\s*\]/g, (match, key, content) => {
            // Parse the JSON array properly to handle both numbers and strings
            const items = JSON.parse(`[${content}]`);
            return `"${key}": "${items.join(',')}"`;
        });

        fs.writeFileSync(outputPath, jsonString);

        console.log(`Successfully processed ${allSections.length} sections.`);
        console.log(`Included: ${includedNames.length}, Excluded: ${excludedNames.length}`);
        console.log(`Results saved to: ${outputPath}`);

    } catch (err) {
        console.error('Extraction failed:', err.message);
    }
}

extractPrices();

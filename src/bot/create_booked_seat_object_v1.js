/**
 * Dynamically constructs a booked seat object from various data sources based on a given object label.
 *
 * This function integrates information from rendering configurations, real-time object statuses,
 * event details, and published chart data to create a comprehensive representation of a seat.
 * It resolves dependencies between these sources to assemble a final object that reflects the
 * seat's current state, including its pricing, category, and relationship to the overall event layout.
 *
 * @param {string} objectLabel - The unique label identifying the seat, typically in a 'section-row-seat' format.
 * @param {Object} renderingInfo - Contains rendering configurations, including channel and category definitions.
 * @param {Object} publishedDetails - Provides the detailed layout and properties of the venue chart, including sections and seat arrangements.
 * @param {Array} objectStatuses - An array of real-time status updates for all objects, including availability and booking status.
 * @param {Object} eventDetails - Contains comprehensive details about the event, including ticket pricing and categories.
 * @returns {Object} A fully constructed booked seat object, or an empty object if the specified seat cannot be found.
 */
function generateRandomInRange(min, max, decimals = 0) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
}
function constructBookedSeatObject(objectLabel, renderingInfo, publishedDetails, objectStatuses, eventDetails, holdToken, selectedSeats) {
    console.log('handing over to constructBookedSeatObject for objectLabel', objectLabel);
    const [sectionLabel, rowLabel, seatLabel] = objectLabel.split('-');
    const eventData = eventDetails?.data || eventDetails;

    // 1. Find the object's current status
    const objectStatus = objectStatuses.find(obj => obj.objectLabelOrUuid === objectLabel);

    if (!objectStatus) {
        console.error(`Status for object ${objectLabel} not found.`);
        return {};
    }
    // 2. Find the channel information
    const channel = renderingInfo.channels.find(c => c.objects.includes(objectLabel));
    const hashedChannelKey = channel ? channel.hashedKey : null;

    // 3. Find detailed seat information from the published chart
    const sectionDetails = publishedDetails.subChart.sections.find(s => s.label === sectionLabel);
    // const rowDetails = sectionDetails?.subChart.rows.find(r => r.label === rowLabel);
    // const seatDetails = rowDetails?.seats.find(s => s.label === seatLabel);

    // Find all rowDetails with the same rowLabel and merge them
    const rowDetailsArray = sectionDetails?.subChart.rows.filter(r => r.label === rowLabel) || [];
    const all_seats = rowDetailsArray.flatMap(r => r.seats);
    let rowDetails = {};
    if (rowDetailsArray.length > 0) {
        console.log(`Found ${rowDetailsArray.length} rowDetails with label ${rowLabel} in section ${sectionLabel}`);
        rowDetails = rowDetailsArray.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    }

    const seatDetails = all_seats.find(s => s.label === seatLabel) || {};
    // const seatDetails = rowDetails?.seats.find(s => s.label === seatLabel);
        const categoryKey =  seatDetails?.categoryKey || sectionDetails?.categoryKey || rowDetails?.categoryKey || null; 
    if (!categoryKey) {
        console.log('No category key found for seat', objectLabel);
    }
    // 4. Find category and pricing information
    const categoryDetails = renderingInfo.categories.find(cat => cat.key === categoryKey);
    
    const ticketDetails = eventData.event_tickets.find(ticket => parseInt(ticket.seats_io_category) === categoryKey);

    let category = {};
    let pricing = {};

    if (categoryDetails && ticketDetails) {
        const price = parseFloat(ticketDetails.price) + parseFloat(ticketDetails.vat);
        const formattedPrice = `[${ticketDetails.currency}]${price.toFixed(0)}`;
        
        pricing = {
            price: price,
            formattedPrice: formattedPrice
        };

        category = {
            label: categoryDetails.label,
            color: categoryDetails.color,
            accessible: categoryDetails.accessible,
            key: categoryDetails.key,
            pricing: {
                price: price,
                formattedPrice: formattedPrice
            },
            isFiltered: false, // Default value
            hasSelectableObjects: true, // Default value
            selectableObjectsStatuses: ["free"] // Default value
        };
    }

    // 5. Assemble the final object
    const bookedSeat = {
        inSelectableChannel: !!channel,
        hashedChannelKey: hashedChannelKey,
        label: objectLabel,
        id: objectLabel,
        uuid: seatDetails.uuid,
        labels: {
            own: seatLabel,
            parent: rowLabel,
            section: sectionLabel,
            displayedLabel: objectLabel
        },
        disabledBySocialDistancingRules: false, // Default
        objectType: "Seat",
        selected: true, // Assuming selected as it's being constructed
        accessible: seatDetails.accessible || false,
        restrictedView: seatDetails.restrictedView || false,
        liftUpArmrests: seatDetails.liftUpArmrests || false,
        companionSeat: seatDetails.companionSeat || false,
        semiAmbulatorySeat: seatDetails.semiAmbulatorySeat || false,
        hearingImpaired: seatDetails.hearingImpaired || false,
        plusSize: seatDetails.plusSize || false,
        category: category,
        pricing: pricing,
        selectable: true, // Default
        status: objectStatus.status,
        forSale: true, // Default
        dataPerEvent: {
            [eventData.seats_io.event_key]: {
                status: objectStatus.status
            }
        },
        seasonStatusOverriddenQuantity: objectStatus.seasonStatusOverriddenQuantity,
        entrance: sectionDetails?.entrance || null,
        previousStatus: objectStatus.previousStatus || null,
        center: seatDetails && sectionDetails ? { x: seatDetails.x + sectionDetails.topLeft.x, y: seatDetails.y + sectionDetails.topLeft.y } : null,
        isOrphan: false, // Default
        parent: {
            type: "row"
        },
        seatId: objectLabel,
        chart: {
            "config": {},
            "iframe": {},
            "embedType": "Renderer",
            "selectedObjectsInput": null,
            "storage": {
                "key": "seatsio"
            },
            "selectedSeats": selectedSeats,
            "selectedObjects": selectedSeats,
            "holdToken": holdToken,
            "reservationToken": holdToken,
            "requestIdCtr": generateRandomInRange(0, 10),
            "requestCallbacks": {},
            "requestErrorCallbacks": {},
            "state": "RENDERED",
            "initialContainerDimensions": {
                "width": generateRandomInRange(900, 1000),
                "height": 0
            },
            "domElementListener": {
                "positionInViewportChangedListener": null,
                "maxSize": generateRandomInRange(4000, 5000),
                "lastDimensions": {
                    "width": generateRandomInRange(900, 1000),
                    "height": generateRandomInRange(700, 800, 3)
                },
                "lastPositionInViewport": {
                    "top": generateRandomInRange(150, 200),
                    "bottom": generateRandomInRange(950, 1000, 6),
                    "right": generateRandomInRange(1600, 1650, 1),
                    "left": generateRandomInRange(650, 700, 1)
                },
                "stopRequested": true,
                "elementIsVisible": true,
                "lastViewportWidth": 1920,
                "lastViewportHeight": 1080
            },
            "iframeElementListener": {
                "widthChangedListener": null,
                "dimensionsChangedListener": null,
                "elementMadeVisibleListener": null,
                "elementMadeInvisibleListener": null,
                "maxSize": null,
                "maxSizeExceededListener": null,
                "lastDimensions": {
                    "width": generateRandomInRange(900, 1000),
                    "height": generateRandomInRange(700, 800, 3)
                },
                "lastPositionInViewport": {
                    "top": generateRandomInRange(150, 200),
                    "bottom": generateRandomInRange(950, 1000, 6),
                    "right": generateRandomInRange(1600, 1650, 1),
                    "left": generateRandomInRange(650, 700, 1)
                },
                "stopRequested": true,
                "elementIsVisible": null,
                "lastViewportWidth": 1920,
                "lastViewportHeight": 1080
            },
            "errorSentToDataCollector": false,
            "seatsioLoadedDeferred": {
                "promise": {}
            },
            "containerVisible": {
                "promise": {}
            },
            "renderingStart": new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            "loadingScreen": {}
        }
    };

    return bookedSeat;
}

export { constructBookedSeatObject };
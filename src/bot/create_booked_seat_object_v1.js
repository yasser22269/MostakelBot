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

    // 1. Find the object's current status (V3 API uses 'name', V1/V2 uses 'objectLabelOrUuid')
    const objectStatus = objectStatuses.find(obj => obj.objectLabelOrUuid === objectLabel || obj.name === objectLabel);

    if (!objectStatus) {
        console.error(`Status for object ${objectLabel} not found.`);
        return {};
    }
    // 2. Find the channel information (V3 uses 'allocations', V1/V2 uses 'channels')
    const isV3Format = !publishedDetails.subChart && Array.isArray(publishedDetails.sections);
    const channelList = renderingInfo.channels || renderingInfo.allocations || [];
    const channel = channelList.find(c => Array.isArray(c.objects) && c.objects.includes(objectLabel));
    const hashedChannelKey = channel ? channel.hashedKey : (objectStatus.allocation || null);

    let sectionDetails, rowDetails = {}, seatDetails = {};
    let categoryKey = null;

    if (isV3Format) {
        // V3: sections are at publishedDetails.sections, no seat-level data
        const v3Section = publishedDetails.sections?.find(s => s.name === sectionLabel);
        sectionDetails = v3Section ? {
            uuid: v3Section.id,
            label: sectionLabel,
            topLeft: v3Section.geometry?.points?.[0] || { x: 0, y: 0 },
            entrance: null,
            categoryKey: objectStatus.specificationKey || null
        } : null;
        // Use objectStatus ids/labels for row/seat
        seatDetails = {
            uuid: objectStatus.uuid,
            label: objectStatus.ids?.own || seatLabel,
            categoryKey: objectStatus.specificationKey || null,
            x: 0, y: 0
        };
        categoryKey = objectStatus.specificationKey || null;
    } else {
        // V1/V2: full seat hierarchy in publishedDetails.subChart.sections
        sectionDetails = publishedDetails.subChart?.sections?.find(s => s.label === sectionLabel);
        const rowDetailsArray = sectionDetails?.subChart?.rows?.filter(r => r.label === rowLabel) || [];
        const all_seats = rowDetailsArray.flatMap(r => r.seats);
        if (rowDetailsArray.length > 0) {
            rowDetails = rowDetailsArray.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        }
        seatDetails = all_seats.find(s => s.label === seatLabel) || {};
        categoryKey = seatDetails?.categoryKey || sectionDetails?.categoryKey || rowDetails?.categoryKey || null;
    }

    if (!categoryKey) {
        console.log('No category key found for seat', objectLabel);
    }
    // 4. Find category and pricing information
    const categoryDetails = (renderingInfo.categories || []).find(cat => cat.key === categoryKey);

    // Find matching ticket: try seats_io_category, then specificationName, then allocation_ids
    const allocationId = seatDetails?.allocationId || rowDetails?.allocationId || sectionDetails?.allocationId;
    const specName = objectStatus.specificationName || '';
    const ticketDetails = eventData.event_tickets.find(ticket => parseInt(ticket.seats_io_category) === categoryKey)
        || eventData.event_tickets.find(ticket => ticket.name === specName || ticket.title === specName)
        || (allocationId && eventData.event_tickets.find(ticket => ticket.allocation_ids?.includes(allocationId)))
        || null;

    let category = {};
    let pricing = {};

    if (ticketDetails) {
        const price = parseFloat(ticketDetails.price) + parseFloat(ticketDetails.vat || 0);
        const formattedPrice = `[${ticketDetails.currency || 'SAR'}]${price.toFixed(0)}`;

        pricing = {
            price: price,
            formattedPrice: formattedPrice
        };

        const catLabel = categoryDetails?.label || ticketDetails.title || ticketDetails.name || specName || '';
        category = {
            label: catLabel,
            color: categoryDetails?.color || '#cccccc',
            accessible: categoryDetails?.accessible || false,
            key: categoryDetails?.key || categoryKey,
            pricing: {
                price: price,
                formattedPrice: formattedPrice
            },
            isFiltered: false,
            hasSelectableObjects: true,
            selectableObjectsStatuses: ["free"]
        };
    }

    // 5. Assemble the final object
    const bookedSeat = {
        inSelectableChannel: !!channel,
        hashedChannelKey: hashedChannelKey,
        label: objectLabel,
        id: objectLabel,
        uuid: seatDetails.uuid,
        sectionUUID: sectionDetails?.uuid || null,
        heldInfo: { uuid: seatDetails.uuid || '', label: objectLabel },
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
        status: 'free',
        isAvailable: true,
        forSale: true, // Default
        dataPerEvent: {
            [eventData.seats_io.event_key]: {
                status: 'free'
            }
        },
        seasonStatusOverriddenQuantity: objectStatus.seasonStatusOverriddenQuantity,
        entrance: sectionDetails?.entrance || null,
        previousStatus: objectStatus.previousStatus || null,
        center: (seatDetails && sectionDetails && sectionDetails.topLeft) ? { x: (seatDetails.x || 0) + sectionDetails.topLeft.x, y: (seatDetails.y || 0) + sectionDetails.topLeft.y } : null,
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
/**
 * Creates a booked seat object based on the provided identifiers and dynamically fetched data.
 * @param {string} own - The 'own' label of the object.
 * @param {string} parent - The 'parent' label of the object.
 * @param {string} section - The 'section' label of the object.
 * @param {Object} renderingInfo - The rendering information.
 * @param {Object} publishedDetails - The published details.
 * @param {Array} objectStatuses - The array of object statuses.
 * @param {Object} eventDetails - The event details.
 * @returns {Object} The booked seat object.
 */
function createBookedSeatObject(own, parent, section, renderingInfo, publishedDetails, objectStatuses, eventDetails) {
    let bookedSeat = {};
    const eventData = eventDetails?.data || eventDetails;

    // Find the object in objectStatuses that matches the 'own' label
    const objectStatus = objectStatuses.find(obj => obj.ids.own === own && obj.ids.parent === parent && obj.ids.section === section );

    if (objectStatus) {
        // Populate top-level properties from objectStatus
        bookedSeat = {
            ...objectStatus,
            label: objectStatus.label,
            uuid: objectStatus.uuid,
            categoryLabel: objectStatus.categoryLabel,
            categoryKey: objectStatus.categoryKey,
            capacity: 0, // This will be updated from publishedDetails
            accessible: false, // This will be updated from publishedDetails
            forSale: objectStatus.forSale,
            objectLabeling: {
                algoName: "",
                prefix: null,
                startAtIndex: 0,
                skippedCharacters: []
            },
            displayLabel: "", // This will be updated from publishedDetails
            labelSize: 100, // This will be updated from publishedDetails
            labelShown: true, // This will be updated from publishedDetails
            labelHorizontalOffset: 0, // This will be updated from publishedDetails
            labelVerticalOffset: 0, // This will be updated from publishedDetails
            objectType: objectStatus.objectType, entrance: objectStatus.entrance,
            translucent: false, // This will be updated from publishedDetails
            viewFromYourSeatImage: null,
            cutoffAngle: 180, // This will be updated from publishedDetails
            bookAsAWhole: false, // This will be updated from publishedDetails
            variableOccupancy: false, // This will be updated from publishedDetails
            minOccupancy: 1, // This will be updated from publishedDetails
            published: true, // This will be updated from publishedDetails
            type: "rectangle", // This will be updated from publishedDetails
            center: { x: 0, y: 0 }, // This will be updated from publishedDetails
            points: null,
            foreground: false, // This will be updated from publishedDetails
            rotationAngle: 0, // This will be updated from publishedDetails
            width: 0, // This will be updated from publishedDetails
            height: 0, // This will be updated from publishedDetails
            cornerRadius: 48, // This will be updated from publishedDetails
            hasSelectablePlaces: true,
            hasSelectedPlaces: false,
            hoverStartTime: null,
            status: objectStatus.status,
            isAvailable: objectStatus.isAvailable,
            channel: objectStatus.channel,
            ids: {
                own: objectStatus.ids.own,
                parent: objectStatus.ids.parent,
                section: objectStatus.ids.section
            },
            labels: {
                own: objectStatus.labels.own.label
            },
            numBooked: objectStatus.numBooked,
            numHeld: objectStatus.numHeld,
            numFree: objectStatus.numFree,
            numNotForeSale: objectStatus.numNotForeSale,
            totalCheckedIn: objectStatus.totalCheckedIn,
            checkedInAt: objectStatus.checkedInAt,
            eligibleForAuction: objectStatus.eligibleForAuction,
            auctionDetails: objectStatus.auctionDetails,
            maxNumHeldBySubEvent: objectStatus.maxNumHeldBySubEvent,
            numHeldBySeason: objectStatus.numHeldBySeason,
            maxNumBookedBySubEvent: objectStatus.maxNumBookedBySubEvent,
            maxNumberReservedBySubEvent: objectStatus.maxNumberReservedBySubEvent,
            numBookedBySeason: objectStatus.numBookedBySeason,
            id: own,
            chart: {
                holdToken: "09191aa2-42ea-4363-a7fc-f0318a8eb7d1", // ** Sample value, not found in provided data
                config: {}
            },
            amount: 1, // **Assuming 1 for a single booked seat //these also should be updated
            numSelected: 1 //**  Assuming 1 for a single booked seat //these also should be updated
        };

        // Populate renderingInfo from objectStatus
        bookedSeat.renderingInfo = {
            ...objectStatus,
            pricing: {
                price: 0, // Will be updated from eventDetails
                initialPrice: 0, // Will be updated from eventDetails
                formattedPrice: "", // Will be updated from eventDetails
                formattedInitialPrice: "", // Will be updated from eventDetails
                formattedOriginalPrice: "" // Will be updated from eventDetails
            },
            pricingFactors: {
                rule: null,
                factor: null,
                bundle: null
            },
            byCurrentToken: false
        };

        // Find corresponding generalAdmissionArea in publishedDetails
        const generalAdmissionArea = publishedDetails.subChart.generalAdmissionAreas.find(
            area => area.uuid === objectStatus.uuid
        );

        if (generalAdmissionArea) {
            // Update top-level properties from generalAdmissionArea
            bookedSeat.capacity = generalAdmissionArea.capacity;
            bookedSeat.accessible = generalAdmissionArea.accessible;
            bookedSeat.forSale = generalAdmissionArea.forSale;
            bookedSeat.objectLabeling = generalAdmissionArea.objectLabeling;
            bookedSeat.displayLabel = generalAdmissionArea.displayLabel;
            bookedSeat.labelSize = generalAdmissionArea.labelSize;
            bookedSeat.labelShown = generalAdmissionArea.labelShown;
            bookedSeat.labelHorizontalOffset = generalAdmissionArea.labelHorizontalOffset;
            bookedSeat.labelVerticalOffset = generalAdmissionArea.labelVerticalOffset;
            bookedSeat.translucent = generalAdmissionArea.translucent;
            bookedSeat.cutoffAngle = generalAdmissionArea.cutoffAngle;
            bookedSeat.bookAsAWhole = generalAdmissionArea.bookAsAWhole;
            bookedSeat.variableOccupancy = generalAdmissionArea.variableOccupancy;
            bookedSeat.minOccupancy = generalAdmissionArea.minOccupancy;
            bookedSeat.published = generalAdmissionArea.published;
            bookedSeat.type = generalAdmissionArea.type;
            bookedSeat.center = generalAdmissionArea.center;
            bookedSeat.foreground = generalAdmissionArea.foreground;
            bookedSeat.rotationAngle = generalAdmissionArea.rotationAngle;
            bookedSeat.width = generalAdmissionArea.width;
            bookedSeat.height = generalAdmissionArea.height;
            bookedSeat.cornerRadius = generalAdmissionArea.cornerRadius;
        }

        // Find category information from renderingInfo
        const categoryInfo = renderingInfo.categories.find(
            cat => cat.key === objectStatus.categoryKey
        );

        if (categoryInfo) {
            bookedSeat.category = {
                label: categoryInfo.label,
                key: categoryInfo.key,
                color: categoryInfo.color,
                accessible: categoryInfo.accessible,
                pricing: {
                    price: 0, // Will be updated from eventDetails
                    initialPrice: 0, // Will be updated from eventDetails
                    formattedPrice: "", // Will be updated from eventDetails
                    formattedInitialPrice: "", // Will be updated from eventDetails
                    formattedOriginalPrice: "" // Will be updated from eventDetails
                }
            };
        }

        // Find pricing information from eventDetails
        const eventTicket = eventData.event_tickets.filter(
            ticket => parseInt(ticket.seats_io_category) === objectStatus.categoryKey
        )[0];

        if (eventTicket) {
            const price = parseFloat(eventTicket.price);
            const vat = parseFloat(eventTicket.vat);
            const currency = eventTicket.currency;

            bookedSeat.renderingInfo.pricing = {
                price: price,
                initialPrice: price,
                formattedPrice: `[${currency}]${price}`,
                formattedInitialPrice: `[${currency}]${price}`,
                formattedOriginalPrice: ""
            };

            if (bookedSeat.category) {
                bookedSeat.category.pricing = {
                    price: price,
                    initialPrice: price,
                    formattedPrice: `[${currency}]${price}`,
                    formattedInitialPrice: `[${currency}]${price}`,
                    formattedOriginalPrice: ""
                };
            }
        }
    }

    return bookedSeat;
}

function createBookedSeatObject_section(own, parent, section, renderingInfo, publishedDetails, objectStatuses, eventDetails,holdToken) {
    const eventData = eventDetails?.data || eventDetails;
    const getPricing = (ticket) => {
        if (!ticket) return { price: 10, initialPrice: 10, formattedPrice: "[SAR]10", formattedInitialPrice: "[SAR]10", formattedOriginalPrice: "" };
        let price = parseFloat(ticket.price);
        // sum price with vat 
        price += parseFloat(ticket.vat);
        return {
            price: price,
            initialPrice: price,
            formattedPrice: `[${ticket.currency}]${price}`,
            formattedInitialPrice: `[${ticket.currency}]${price}`,
            formattedOriginalPrice: ""
        };
    };
    const objectStatus = objectStatuses.find(obj => obj.ids.own === own && obj.ids.parent === parent && obj.ids.section === section);
    if (!objectStatus) return {};

    const sectionDetails = publishedDetails.subChart.sections.find(s => s.label === section);

    const allRelatedRows = sectionDetails?.subChart?.rows?.filter(r => r.label === parent);
    const allSeatsInAllRows = allRelatedRows.flatMap(r => r.seats);
    const rowDetails = allRelatedRows[allRelatedRows.length - 1];
    rowDetails.seats = allSeatsInAllRows;


    const seatDetails = rowDetails?.seats?.find(s => s.label === own);
    const categoryInfo = renderingInfo.categories.find(cat => cat.key === objectStatus.categoryKey);
    const eventTicket = eventData.event_tickets.filter(ticket => parseInt(ticket.seats_io_category) === objectStatus.categoryKey)[0];


    const mainPricing = getPricing(eventTicket);

    const rowWithDetailedSeats = rowDetails ? {
        ...rowDetails,
        seats: rowDetails.seats.map(seat => {
            const seatStatus = objectStatuses.find(obj => obj.ids.own === seat.label && obj.ids.parent === parent && obj.ids.section === section);
            const seatEventTicket = eventData.event_tickets.find(ticket => parseInt(ticket.seats_io_category) === seatStatus?.categoryKey);
            const seatPricing = getPricing(seatEventTicket);
            
            
            return {
                ...seat,
                renderingInfo: {
                    ...(seatStatus || {}),
                    pricing: seatPricing,
                    pricingFactors: { rule: null, factor: null, bundle: null },
                    byCurrentToken: false
                }
            };
        })
    } : {};
    // console.log('got number of seats', rowWithDetailedSeats.seats.length);
    rowWithDetailedSeats.leftmostSeat = rowWithDetailedSeats?.seats[0];
    rowWithDetailedSeats.rightmostSeat = rowWithDetailedSeats?.seats[rowWithDetailedSeats.seats.length - 1];
    // console.log('left seat lable', rowWithDetailedSeats.leftmostSeat.label);

    rowWithDetailedSeats.topmostSeat = rowWithDetailedSeats?.seats[0];
    rowWithDetailedSeats.bottommostSeat = rowWithDetailedSeats?.seats[rowWithDetailedSeats.seats.length - 1];
    //row uuid
    console.log('row uuid', rowWithDetailedSeats.uuid);

    return {
        // random value betwen 100 and 1000
        x: Math.floor(Math.random() * (1000 - 100 + 1) + 100),
        y: Math.floor(Math.random() * (1000 - 100 + 1) + 100),
        label: objectStatus.label,
        displayLabel: "",
        categoryLabel: objectStatus.categoryLabel,
        categoryAccessible: categoryInfo?.accessible || false,
        categoryKey: objectStatus.categoryKey,
        restrictedView: seatDetails?.restrictedView || false,
        viewFromYourSeatImage: "",
        accessible: seatDetails?.accessible || false,
        companionSeat: seatDetails?.companionSeat || false,
        semiAmbulatorySeat: seatDetails?.semiAmbulatorySeat || false,
        disabledBySocialDistancingRules: seatDetails?.disabledBySocialDistancingRules || false,
        entrance: objectStatus.entrance,
        uuid: objectStatus.uuid,
        published: true,
        renderingInfo: {
            ...objectStatus,
            pricing: mainPricing,
            pricingFactors: { rule: null, factor: null, bundle: null },
            byCurrentToken: false
        },
        section: objectStatus.section,
        row: rowWithDetailedSeats,
        status: objectStatus.status,
        forSale: objectStatus.forSale,
        isAvailable: objectStatus.isAvailable,
        channel: objectStatus.channel,
        channelName: objectStatus.channelName,
        ids: objectStatus.ids,
        labels: {
            section: objectStatus.labels.section,
            parent: objectStatus.labels.parent.label,
            own: objectStatus.labels.own.label
        },
        objectType: objectStatus.objectType,
        numBooked: objectStatus.numBooked,
        numHeld: objectStatus.numHeld,
        numFree: objectStatus.numFree,
        numNotForeSale: objectStatus.numNotForeSale,
        totalCheckedIn: objectStatus.totalCheckedIn,
        checkedInAt: objectStatus.checkedInAt,
        eligibleForAuction: objectStatus.eligibleForAuction,
        auctionDetails: objectStatus.auctionDetails,
        maxNumHeldBySubEvent: objectStatus.maxNumHeldBySubEvent,
        numHeldBySeason: objectStatus.numHeldBySeason,
        maxNumBookedBySubEvent: objectStatus.maxNumBookedBySubEvent,
        maxNumberReservedBySubEvent: objectStatus.maxNumberReservedBySubEvent,
        numBookedBySeason: objectStatus.numBookedBySeason,
        pricing: mainPricing,
        pricingFactors: {
            rule: null,
            factor: null,
            bundle: null
        },
        byCurrentToken: false,
        id: objectStatus.label,
        viewFromSeatUrl: "",
        chart: {
            holdToken,
            config: {}
        },
        category: {
            ...categoryInfo,
            pricing: mainPricing
        },
        parent: {
            type: "row"
        },
        parentSectionLabel: section
    };
}

/**
 * Creates a booked seat object from the given objectStatus, renderingInfo, publishedDetails, objectStatuses, eventDetails, and holdToken.
 *
 * @param {string} own - The label of the seat.
 * @param {string} parent - The label of the parent object (row).
 * @param {string} section - The label of the section.
 * @param {object} renderingInfo - The rendering info object.
 * @param {object} publishedDetails - The published details object.
 * @param {object[]} objectStatuses - The array of object status objects.
 * @param {object} eventDetails - The event details object.
 * @param {string} holdToken - The hold token.
 * @returns {object} The booked seat object.
 */
function createBookedSeatObject_section_v1(own, parent, section, renderingInfo, publishedDetails, objectStatuses, eventDetails,holdToken) {
    const eventData = eventDetails?.data || eventDetails;
    const objectStatus = objectStatuses.find(obj => obj.ids.own === own && obj.ids.parent === parent && obj.ids.section === section);
    if (!objectStatus) return {};

    const sectionDetails = publishedDetails.subChart.sections.find(s => s.label === section);
    const rowDetails = sectionDetails?.subChart?.rows?.find(r => r.label === parent);
    const seatDetails = rowDetails?.seats?.find(s => s.label === own);
    const categoryInfo = renderingInfo.categories.find(cat => cat.key === objectStatus.categoryKey);
    const eventTicket = eventData.event_tickets.filter(ticket => parseInt(ticket.seats_io_category) === objectStatus.categoryKey)[0];

    const getPricing = (ticket) => {
        if (!ticket) return { price: 10, initialPrice: 10, formattedPrice: "[SAR]10", formattedInitialPrice: "[SAR]10", formattedOriginalPrice: "" };
        let price = parseFloat(ticket.price);
        // sum price with vat 
        price += parseFloat(ticket.vat);
        return {
            price: price,
            initialPrice: price,
            formattedPrice: `[${ticket.currency}]${price}`,
            formattedInitialPrice: `[${ticket.currency}]${price}`,
            formattedOriginalPrice: ""
        };
    };

    const mainPricing = getPricing(eventTicket);

    const rowWithDetailedSeats = rowDetails ? {
        ...rowDetails,
        seats: rowDetails.seats.map(seat => {
            const seatStatus = objectStatuses.find(obj => obj.ids.own === seat.label && obj.ids.parent === parent && obj.ids.section === section);
            const seatEventTicket = eventData.event_tickets.find(ticket => parseInt(ticket.seats_io_category) === seatStatus?.categoryKey);
            const seatPricing = getPricing(seatEventTicket);
            
            return {
                ...seat,
                renderingInfo: {
                    ...(seatStatus || {}),
                    pricing: seatPricing,
                    pricingFactors: { rule: null, factor: null, bundle: null },
                    byCurrentToken: false
                }
            };
        })
    } : {};

    return {
        // random value betwen 100 and 1000
        x: Math.floor(Math.random() * (1000 - 100 + 1) + 100),
        y: Math.floor(Math.random() * (1000 - 100 + 1) + 100),
        label: objectStatus.label,
        displayLabel: "",
        categoryLabel: objectStatus.categoryLabel,
        categoryAccessible: categoryInfo?.accessible || false,
        categoryKey: objectStatus.categoryKey,
        restrictedView: seatDetails?.restrictedView || false,
        viewFromYourSeatImage: "",
        id: objectStatus.lable,
        accessible: seatDetails?.accessible || false,
        companionSeat: seatDetails?.companionSeat || false,
        semiAmbulatorySeat: seatDetails?.semiAmbulatorySeat || false,
        disabledBySocialDistancingRules: seatDetails?.disabledBySocialDistancingRules || false,
        entrance: objectStatus.entrance,
        uuid: objectStatus.uuid,
        published: true,
        renderingInfo: {
            ...objectStatus,
            pricing: mainPricing,
            pricingFactors: { rule: null, factor: null, bundle: null },
            byCurrentToken: false
        },
        section: objectStatus.section,
        row: rowWithDetailedSeats,
        status: objectStatus.status,
        forSale: objectStatus.forSale,
        isAvailable: objectStatus.isAvailable,
        channel: objectStatus.channel,
        channelName: objectStatus.channelName,
        ids: objectStatus.ids,
        labels: {
            section: objectStatus.labels.section,
            parent: objectStatus.labels.parent.label,
            own: objectStatus.labels.own.label
        },
        objectType: objectStatus.objectType,
        numBooked: objectStatus.numBooked,
        numHeld: objectStatus.numHeld,
        numFree: objectStatus.numFree,
        numNotForeSale: objectStatus.numNotForeSale,
        totalCheckedIn: objectStatus.totalCheckedIn,
        checkedInAt: objectStatus.checkedInAt,
        eligibleForAuction: objectStatus.eligibleForAuction,
        auctionDetails: objectStatus.auctionDetails,
        maxNumHeldBySubEvent: objectStatus.maxNumHeldBySubEvent,
        numHeldBySeason: objectStatus.numHeldBySeason,
        maxNumBookedBySubEvent: objectStatus.maxNumBookedBySubEvent,
        maxNumberReservedBySubEvent: objectStatus.maxNumberReservedBySubEvent,
        numBookedBySeason: objectStatus.numBookedBySeason,
        pricing: mainPricing,
        pricingFactors: {
            rule: null,
            factor: null,
            bundle: null
        },
        byCurrentToken: false,
        viewFromSeatUrl: "",
        chart: {
            holdToken,
            config: {}
        },
        category: {
            ...categoryInfo,
            pricing: mainPricing
        },
        parent: {
            type: "row"
        },
        parentSectionLabel: section
    };
}

// To export for testing or further use
export { createBookedSeatObject, createBookedSeatObject_section };
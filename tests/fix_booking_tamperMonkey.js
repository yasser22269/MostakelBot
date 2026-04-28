// ==UserScript==
// @name         Webook Booking Fixer
// @version      3.0
// @description  Fixes booking payload on webook.com checkout
// @author       abo soud
// @match        https://webook.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const TARGET = 'event-seat/checkout';
    const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

    // ─── Fix a single seat ────────────────────────────────────────────────────
    function fixSeat(seat, holdToken) {
        seat.status                    = 'free';
        seat.isAvailable               = true;
        seat.published                 = true;
        seat.sectionUUID               = seat.sectionUUID || seat.sectionId || null;
        seat.chart                     = { holdToken, config: {} };
        seat.heldInfo                  = seat.heldInfo || { uuid: seat.uuid, label: seat.label };

        if (seat.renderingInfo) {
            seat.renderingInfo.status      = 'free';
            seat.renderingInfo.isAvailable = true;
        }

        delete seat.selectedTicketType;
        return seat;
    }

    // ─── Fix full payload ─────────────────────────────────────────────────────
    function fixPayload(bodyStr) {
        const payload = JSON.parse(bodyStr);
        const { holdToken, selectedSeats } = payload;

        if (!holdToken || !selectedSeats) return bodyStr;

        const seats = JSON.parse(selectedSeats).map(s => fixSeat(s, holdToken));
        payload.selectedSeats = JSON.stringify(seats);

        console.log('[Webook Fixer] ✅ Fixed', seats.length, 'seat(s) with token:', holdToken);
        return JSON.stringify(payload);
    }

    // ─── Intercept fetch ─────────────────────────────────────────────────
    const originalFetch = win.fetch.bind(win);

    win.fetch = function (input, init = {}) {
        const url = typeof input === 'string' ? input : input?.url ?? '';

        if (url.includes(TARGET) && (init.method || '').toUpperCase() === 'POST' && init.body) {
            try {
                init.body = fixPayload(init.body);
            } catch (e) {
                console.error('[Webook Fixer] ❌ Failed:', e);
            }
        }

        return originalFetch(input, init);
    };

    console.log('[Webook Fixer] ✅ Active — watching:', TARGET);

})();

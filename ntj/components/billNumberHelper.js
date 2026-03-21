// ntj/components/billNumberHelper.js
// Shared helper: fetch the next global sequential bill number from the backend.
// Returns a zero-padded 5-digit string like "00001", "00042", "12345".
// On failure, returns a timestamp-based fallback so the bill save still proceeds.

import { base_url } from "./config";

export const fetchNextBillNo = async () => {
    try {
        const res = await fetch(`${base_url}/billSummary/nextBillNo`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Ensure 5-digit zero-padded format regardless of what the server sends
        const n = parseInt(data.billNo || data.counter || 0, 10);
        return String(n).padStart(5, "0");
    } catch (err) {
        console.warn("⚠️  Could not fetch next bill number, using timestamp fallback:", err.message);
        // Fallback: last 5 digits of current timestamp – unique enough to avoid clashes
        return String(Date.now()).slice(-5);
    }
};

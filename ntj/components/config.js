// config.js
// ─────────────────────────────────────────────────────────────
//  Priority 1 : LAN (your PC's current Wi-Fi IP) — used by
//               Expo Go on the phone and the web browser on
//               the same network.
//
//  Priority 2 : Render cloud URL — uncomment when the backend
//               is deployed and you want a universal URL.
//
//  HOW TO UPDATE THE IP:
//    Open a PowerShell / Terminal on this PC and run:
//      ipconfig        (Windows)
//      ifconfig        (Mac / Linux)
//    Copy the IPv4 address of your Wi-Fi adapter and paste
//    it below in place of the existing IP.
// ─────────────────────────────────────────────────────────────

// ✅ Current LAN IP (update this whenever your router gives a new IP)
// const LAN_IP = '192.168.1.6';
// const PORT   = '3000';

// Cloud / production URL (leave commented while developing locally)
// export const base_url = 'https://ntj-62zb.onrender.com/api';

// export const base_url = `https://svj-project1.onrender.com/api`;

export const base_url = `http://192.168.29.73:5000/api`;

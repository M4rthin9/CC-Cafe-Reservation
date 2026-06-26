# PromptPay QR Integration — Implementation Guide

## Overview

Replace static `promptpay-qr.png` with dynamically generated PromptPay QR codes via promptpay.io. Two components:

1. **Standalone tool page** (`promptpay.html`) — like iamickdev.com/tools/promptpay
2. **Payment integration** — auto-generate QR with booking amount in status page

## How It Works

### Payment QR (shown to customer)
- Uses **promptpay.io** API: `https://promptpay.io/{ID}/{amount}.png`
- External service generates valid, scannable QR codes server-side
- Same ID + same amount = same QR (inherent to P2P PromptPay format)

### Anti-scam: Duplicate Slip Detection
- When user uploads a payment slip, client reads the QR code on the slip using `jsQR`
- Parses with `promptparse.validate.slipVerify()` to extract the bank's unique `transRef`
- Sends `transRef` to Google Apps Script
- Server stores used `transRef`s in a `UsedPayments` sheet
- If same `transRef` is submitted again → rejected as duplicate

## Files Changed

| File | Change |
|------|--------|
| `status.html` | Removed `qrcode` CDN, added `jsQR` CDN |
| `src/js/status.js` | `showPayment()` → promptpay.io img; `submitPayment()` → scan slip QR + extract transRef |
| `promptpay.html` | Replaced client-side QR libs with promptpay.io URL |
| `google_apps_script_updated.js` | Added `PAYMENTS_SHEET` + `getUsedPaymentsSheet()` + duplicate check in `updateSlipAndStatus` |

## Flow

```
User clicks "ดำเนินการชำระเงิน"
  → showPayment(): <img src="https://promptpay.io/{ID}/{amount}.png">
  → User scans QR, pays via banking app, gets slip
  → User uploads slip image

User clicks "ยืนยันการชำระเงิน"
  → submitPayment():
    1. Load slip image onto <canvas>, decode QR with jsQR
    2. Parse with promptparse.validate.slipVerify() → { sendingBank, transRef }
    3. Upload slip image to Google Drive
    4. POST updateSlipAndStatus with transRef
    5. Server checks UsedPayments sheet:
       - transRef exists? → reject "สลิปนี้ถูกใช้แล้ว"
       - transRef new?   → save + update booking status
```

## Setup

1. Set `PROMPTPAY_ID` in `src/js/status.js:4` (already set to `0994000160208`)
2. Deploy static files to GitHub Pages
3. Deploy `google_apps_script_updated.js` to Google Apps Script
4. The `UsedPayments` sheet auto-creates on first payment submission

## Key Libraries (CDN)
- `promptparse` — for slip verification (`validate.slipVerify()`)
- `jsQR` — for decoding QR codes from uploaded slip images
- `promptpay.io` — external service for generating payment QR images

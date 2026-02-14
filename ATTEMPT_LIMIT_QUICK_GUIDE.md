# 10-Attempt Limit - Quick Reference

## ✅ What Was Fixed

**Before:** Voice captcha questions repeated infinitely - user could try forever  
**After:** After 10 failed attempts, transaction is automatically denied

---

## 🎯 Key Features

| Feature             | Details                                               |
| ------------------- | ----------------------------------------------------- |
| **Attempt Limit**   | 10 attempts per transaction                           |
| **Tracking**        | Database records each attempt count                   |
| **UI Feedback**     | Counter shows "Attempt X/10" and remaining attempts   |
| **Auto-Denial**     | After 10 attempts, transaction status set to 'denied' |
| **Control Disable** | Record/Verify buttons disabled when max reached       |

---

## 📊 Attempt Flow

```
Attempt 1-9:  ❌ Failed → Ask new question → Try again
Attempt 10:   ❌ Failed → 🚫 TRANSACTION DENIED → Stop
```

---

## 🔧 Implementation Summary

### Backend (`voiceCaptchaController.js`)

- ✅ Track `currentAttempt` = `verificationResult.verificationAttempts + 1`
- ✅ Check if `currentAttempt > 10` → Deny
- ✅ Update database: `transaction.status = 'denied'`
- ✅ Return `isDenied: true` to frontend

### Frontend (`VoiceCaptcha.jsx`)

- ✅ Display attempt counter: "Attempt X/10 - Y attempts left"
- ✅ Disable buttons when `isMaxAttemptsReached`
- ✅ Hide "Verify Response" button when max reached
- ✅ Show denial message instead of asking new question

### Transfer Page (`Transfer.jsx`)

- ✅ Detect denial message in `handleVerificationComplete`
- ✅ Show clear denial UI: "🚫 Transaction Denied"
- ✅ Reset form so user can start fresh transaction

---

## 🔐 Security Impact

✅ **Prevents Brute Force:** Can't guess security answer endlessly  
✅ **Database Records:** Each attempt logged for audit trail  
✅ **Clear Denial:** Transaction explicitly marked as denied  
✅ **UX Safe:** User can't accidentally keep trying after denial

---

## 📝 Files Modified

| File                                           | Changes                                       |
| ---------------------------------------------- | --------------------------------------------- |
| `server/controllers/voiceCaptchaController.js` | Added attempt tracking & 10-limit check       |
| `client/src/components/VoiceCaptcha.jsx`       | Added attempt counter display & disable logic |
| `client/src/pages/Transfer.jsx`                | Added denial message handling                 |

---

## 🧪 Testing

Try this:

1. Start a transfer
2. Deliberately answer incorrectly 10 times
3. After 10th attempt, you should see: "🚫 Transaction Denied"
4. Recording/Verify buttons should be disabled
5. Check database: `transaction.status` = `'denied'`

---

## 💡 User Perspective

**After 9 Failed Attempts:**

```
Attempt 9/10 - Verification failed. (1 attempt left)
🔄 New question...
Listen to the question above and respond...
```

**After 10 Failed Attempts:**

```
Attempt 10/10 - Maximum 10 attempts reached.
Transaction has been denied.

🚫 Transaction Denied: Maximum verification attempts exceeded.
Please try again later.

[All buttons disabled]
```

---

## ⚙️ Configuration

To change attempt limit from 10 to 5:

**File:** `server/controllers/voiceCaptchaController.js` (Line ~118)

```javascript
const MAX_TOTAL_ATTEMPTS = 5; // Changed from 10
```

Then also update UI text references from "10" to "5":

**File:** `client/src/components/VoiceCaptcha.jsx` (Line ~160)

```jsx
<strong>Attempt {currentAttempt}/5</strong>;
{
  !isMaxAttemptsReached && (
    <span> - {5 - currentAttempt} attempts remaining</span>
  );
}
```

---

## 📋 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Transaction approved",
  "currentAttempt": 5
}
```

### Failed (Retry Available)

```json
{
  "success": false,
  "message": "Verification failed. Attempts left: 5",
  "isDenied": false,
  "attemptsLeft": 5,
  "currentAttempt": 5
}
```

### Denied (Max Attempts Reached)

```json
{
  "success": false,
  "message": "Maximum 10 attempts reached. Transaction has been denied.",
  "isDenied": true,
  "attemptsLeft": 0,
  "currentAttempt": 10
}
```

---

## 🚀 What's Next?

1. **Rate Limiting:** Add time-based delays between attempts
2. **Admin Notifications:** Alert when user reaches max attempts
3. **Account Lock:** Lock account after N failed transactions
4. **Exponential Backoff:** Increase delay after each failure

---

## 📞 Support

For issues or questions:

- Check console logs (shows attempt count in every request)
- Look at database: `Transaction.verificationResult.verificationAttempts`
- Review backend logs: `server/controllers/voiceCaptchaController.js`

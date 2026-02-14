# Voice Captcha - 10 Attempt Limit Implementation

## Problem Statement

- Voice captcha was repeating unlimitedly without any attempt restrictions
- Users could keep trying without any consequences
- No security mechanism to prevent brute force attacks on voice verification

## Solution Implemented

### ✅ Hard Limit: 10 Attempts Per Transaction

After 10 failed voice captcha attempts, the transaction is automatically **denied**.

---

## Technical Implementation

### 1. Backend Changes: `voiceCaptchaController.js`

#### Added Attempt Tracking

```javascript
// Track attempts per transaction
let currentAttempt = 0;
let attemptsLeft = MAX_ATTEMPTS;
const MAX_TOTAL_ATTEMPTS = 10; // Hard limit

if (transactionId) {
  const transaction = await Transaction.findById(transactionId);
  if (transaction) {
    currentAttempt =
      (transaction.verificationResult?.verificationAttempts || 0) + 1;

    // Check if already exceeded max attempts
    if (currentAttempt > MAX_TOTAL_ATTEMPTS) {
      return res.json({
        success: false,
        message: "Maximum attempts exceeded. Transaction denied.",
        attemptsLeft: 0,
        isDenied: true,
      });
    }

    attemptsLeft = MAX_TOTAL_ATTEMPTS - currentAttempt;
  }
}
```

#### Database Update

```javascript
// Update transaction with current attempt count
if (transactionId) {
  await Transaction.findByIdAndUpdate(transactionId, {
    $set: {
      "verificationResult.verificationAttempts": currentAttempt,
      "verificationResult.lastVerificationAttempt": new Date(),
    },
  });
}
```

#### Transaction Denial on Max Attempts

```javascript
// When attempts reach 10
if (currentAttempt >= MAX_TOTAL_ATTEMPTS) {
  await Transaction.findByIdAndUpdate(transactionId, {
    $set: {
      "verificationResult.voiceVerificationStatus": "failed",
      status: "denied", // 🔴 TRANSACTION STATUS SET TO DENIED
    },
  });

  return res.json({
    success: false,
    message: "Maximum 10 attempts reached. Transaction has been denied.",
    attemptsLeft: 0,
    currentAttempt,
    isDenied: true,
  });
}
```

#### Response Format

```javascript
{
  success: false,
  message: "Maximum 10 attempts reached. Transaction has been denied.",
  attemptsLeft: 0,           // 0 means no more attempts
  currentAttempt: 10,        // Which attempt this was
  isDenied: true,            // Flag indicating transaction is denied
  similarity: 0.65,
  recognizedText: "blue"
}
```

---

### 2. Frontend Changes: `VoiceCaptcha.jsx`

#### State Management

```javascript
const [currentAttempt, setCurrentAttempt] = useState(0);
const [isMaxAttemptsReached, setIsMaxAttemptsReached] = useState(false);
```

#### Attempt Counter Display

```jsx
{
  /* Display attempt counter */
}
{
  currentAttempt > 0 && (
    <div
      className={`alert ${
        isMaxAttemptsReached ? "alert-danger" : "alert-warning"
      } mb-3`}
    >
      <strong>Attempt {currentAttempt}/10</strong>
      {!isMaxAttemptsReached && (
        <span> - {10 - currentAttempt} attempts remaining</span>
      )}
    </div>
  );
}
```

#### Handle Max Attempts Response

```javascript
if (data.isDenied) {
  failureMessage = `❌ Maximum 10 attempts reached. Transaction has been denied.`;
  setIsMaxAttemptsReached(true);
  setVerificationStatus(failureMessage);
  // Do NOT call onRequestNewQuestion - transaction is over
  onVerificationComplete(
    false,
    "Transaction denied - maximum attempts exceeded"
  );
} else if (data.attemptsLeft > 0) {
  // Attempts remaining - ask new question
  failureMessage += ` (${data.attemptsLeft} attempts left)`;
  setVerificationStatus(`❌ ${failureMessage}`);
  if (onRequestNewQuestion) {
    setTimeout(() => {
      onRequestNewQuestion(); // Ask next question after delay
    }, 1500);
  }
}
```

#### Disable Controls When Max Attempts

```jsx
<button
  className={`btn ${isRecording ? "btn-danger" : "btn-success"}`}
  onClick={isRecording ? stopRecording : startRecording}
  disabled={isLoading || isMaxAttemptsReached} // 🔴 DISABLE
>
  {isRecording ? "⏹️ Stop Recording" : "🎙️ Start Recording"}
</button>;

{
  audioBlob &&
    !isLoading &&
    !isMaxAttemptsReached && ( // 🔴 HIDE BUTTON
      <button className="btn btn-primary" onClick={verifyResponse}>
        🔍 Verify Response
      </button>
    );
}
```

---

### 3. Frontend Changes: `Transfer.jsx`

#### Handle Transaction Denial

```javascript
const handleVerificationComplete = async (success, message) => {
  setShowVoiceVerification(false);
  setSelectedQuestion(null);

  if (!success) {
    // Check if message indicates transaction denial
    if (message && message.includes("maximum attempts")) {
      setVerificationResult({
        success: false,
        message:
          "🚫 Transaction Denied: Maximum verification attempts exceeded. Please try again later.",
      });
    } else {
      setVerificationResult({
        success: false,
        message: message || "Voice verification failed.",
      });
    }
    resetForm();
    return;
  }

  // If success, proceed to complete transaction...
};
```

---

## Flow Diagram

```
User Initiates Transaction
        ↓
Questions Asked (1-10 attempts)
        ↓
For each attempt:
  1. Backend reads transaction.verificationResult.verificationAttempts
  2. Increments to currentAttempt
  3. Checks if currentAttempt > 10
  4. If YES:
     - Sets transaction.status = 'denied'
     - Returns isDenied: true
     - Frontend disables all controls
     - Message: "Transaction has been denied"
  5. If NO and verification failed:
     - Sets attemptsLeft = 10 - currentAttempt
     - Returns new question via onRequestNewQuestion
     - User tries again (attempts 2-9)
  6. If verification succeeds:
     - Returns success: true
     - Transaction proceeds normally
```

---

## User Experience

### Attempt 1-9: Keep Trying

```
Attempt 3/10 - Verification failed. (7 attempts left)
🔄 New question loading...
```

### Attempt 10: Transaction Denied

```
Attempt 10/10 - Maximum 10 attempts reached. Transaction has been denied.
🚫 Transaction Denied: Maximum verification attempts exceeded.
Please try again later.

[Recording button DISABLED]
[Verify Response button HIDDEN]
```

---

## Security Benefits

| Feature                     | Benefit                                       |
| --------------------------- | --------------------------------------------- |
| Hard 10-attempt limit       | Prevents unlimited brute force attacks        |
| Transaction status update   | Database records failed verification attempts |
| Attempt counter in database | Admin can audit verification failures         |
| UI controls disabled        | Prevents accidental re-submission             |
| Clear denial message        | User understands transaction was rejected     |

---

## Database Schema

### Transaction.verificationResult (Updated)

```javascript
verificationResult: {
  voiceMatch: Boolean,
  contentMatch: Boolean,
  voiceSimilarity: Number,
  textSimilarity: Number,
  verificationAttempts: { type: Number, default: 0 },  // ✅ USED FOR LIMIT
  lastVerificationAttempt: Date,                        // ✅ UPDATED
  voiceVerificationStatus: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'expired'],
    default: 'pending'
  }
},
status: {
  type: String,
  enum: ['pending', 'approved', 'denied', 'completed'],
  default: 'pending'                                    // ✅ SET TO 'DENIED'
}
```

---

## Testing Checklist

- [x] Attempt counter increments correctly (1-10)
- [x] Backend tracks attempts in database
- [x] After 9th failure, new question asked
- [x] After 10th failure, transaction denied
- [x] UI controls disabled when `isDenied: true`
- [x] "Verify Response" button hidden when max attempts
- [x] Transaction status set to 'denied' in database
- [x] User sees clear denial message
- [x] Error message includes attempt count

---

## What Happens After Denial?

1. **Transaction is in database with status: 'denied'**
2. **User sees:** "🚫 Transaction Denied: Maximum verification attempts exceeded. Please try again later."
3. **User must start over:**
   - Click "Transfer", "Deposit", or "Withdraw" again
   - Creates a NEW transaction with fresh 10-attempt limit
   - Previous denied transaction remains in history

---

## Configuration

### Hard Limit (In Backend)

**File:** `server/controllers/voiceCaptchaController.js`

```javascript
const MAX_TOTAL_ATTEMPTS = 10; // Change this to adjust limit
```

To change from 10 to 5 attempts:

```javascript
const MAX_TOTAL_ATTEMPTS = 5;
```

---

## Logs

When attempt limit is reached, console shows:

```
====================================
🚫 MAXIMUM ATTEMPTS REACHED — TRANSACTION DENIED:
- User ID: 507f1f77bcf36cd799439011
- Transaction ID: 607f1f77bcf36cd799439012
- Attempt: 10/10
- Verification Field: nickname
- Expected Answer: "John"
- User Said: "Jane"
- Voice Match: true
- Content Match: false
- Voice Similarity: 0.88
- Text Similarity: 0.20
- Attempts Left: 0
====================================
```

---

## Future Enhancements

1. **Rate Limiting by User:** Restrict transaction attempts per hour/day
2. **Exponential Backoff:** Add delay between attempts (2s, 5s, 10s, 30s)
3. **Admin Alert:** Notify admin when user reaches max attempts
4. **Transaction Lock:** Lock account after 3 failed transactions
5. **Email Notification:** Send email when transaction is denied

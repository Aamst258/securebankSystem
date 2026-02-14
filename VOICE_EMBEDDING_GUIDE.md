# Voice Embedding & Registration Guide

## Overview

The SecureBank system uses **Resemblyzer** to extract voice embeddings from user recordings. These embeddings are used for voice-based authentication and verification.

---

## Recording Duration Recommendations

### Duration Guidelines

| Duration      | Quality        | Use Case        | Notes                                    |
| ------------- | -------------- | --------------- | ---------------------------------------- |
| < 5 sec       | ⚠️ Poor        | Not Recommended | Insufficient data for reliable embedding |
| 5-10 sec      | ⚠️ Minimum     | Emergency only  | May have accuracy issues                 |
| **10-15 sec** | ✅ **Optimal** | **Recommended** | Best balance of quality & time           |
| 15-20 sec     | ⭐ Excellent   | High security   | Overkill for most use cases              |
| > 20 sec      | ⭐ Excellent   | Research        | Diminishing returns                      |

### Current Implementation

**Frontend (Signup.jsx):**

- Recording limit: **15 seconds** (auto-stop after 15s)
- Visual feedback: Progress bar showing recording progress
- Quality indicator: Shows "Minimum", "Good", or "Excellent" based on duration

**Backend (voiceBiometricController.js):**

- Uses Resemblyzer `/embed` endpoint to extract embeddings
- Stores embedding vector in database (User.voiceEmbedding)
- Returns voiceprintId and embedding for client storage

---

## Voice Embedding Process

### 1. Signup Flow

```
User Records Voice (10-15s)
       ↓
Browser: Converts WebM to WAV (16kHz, mono)
       ↓
POST /api/voice/register
       ↓
Node Backend: Forwards to Python Resemblyzer
       ↓
Python (Flask): /embed endpoint
   - Converts audio to WAV if needed
   - Uses preprocess_wav() to normalize
   - Uses VoiceEncoder.embed_utterance()
       ↓
Returns embedding vector (256-dim)
       ↓
Stored in User.voiceEmbedding
```

### 2. Verification Flow

```
User Records Answer (5-10s)
       ↓
POST /api/voice-captcha/verify
       ↓
Python Resemblyzer: /verify endpoint
   - Extracts embedding from recorded audio
   - Compares with stored embedding
   - Calculates cosine similarity
       ↓
Returns: isMatch (bool), similarity (0-1)
       ↓
If similarity > 0.75 → ✅ Verified
If similarity < 0.75 → ❌ Failed (ask new question)
```

---

## Technical Details

### Resemblyzer Model

- **Model**: VoiceEncoder (trained on LibriSpeech)
- **Output**: 256-dimensional embedding vector
- **Distance Metric**: Cosine similarity
- **Threshold**: 0.75 (75% similarity required for match)

### Audio Processing

1. **Input**: WebM (variable bitrate)
2. **Conversion**: FFmpeg converts to WAV
   - Sample rate: 16000 Hz
   - Channels: 1 (mono)
   - Bit depth: 16-bit PCM
3. **Preprocessing**: `preprocess_wav()`
   - Normalizes audio level
   - Removes silence/padding
4. **Embedding**: VoiceEncoder extracts 256-dim vector

### Backend Routes

**Registration:**

```
POST /api/voice/register
Input: audio file (WebM)
Output: { voiceprintId, embedding }
```

**Verification:**

```
POST /api/voice-captcha/verify
Input: audio file, question, field, userId
Output: { success, isMatch, similarity, recognizedText }
```

---

## Quality Factors Affecting Voice Embeddings

### Good Practice ✅

- Clear speech (articulate pronunciation)
- Natural voice (not whispering or yelling)
- Quiet background (minimal noise)
- Consistent microphone & settings
- 10-15 seconds of continuous speech

### Poor Practice ❌

- Mumbling or unclear speech
- Heavy background noise
- Inconsistent volume
- Whispering or shouting
- Very short recordings (< 5 sec)
- Multiple people speaking

---

## Threshold Adjustment

### Current Threshold: 0.75

Located in: `server/routes/voiceCaptchaRoutes.js`

```javascript
const SIMILARITY_THRESHOLD = 0.75; // 75% match required
```

### Adjusting Sensitivity

- **Lower threshold (0.60-0.70)**: More lenient, easier to pass, higher false-positive risk
- **Current (0.75)**: Balanced, recommended for most use cases
- **Higher threshold (0.80-0.90)**: More strict, harder to pass, lower false-positive risk

### Recommendation

For a banking system, keep threshold at **0.75-0.80** for security while maintaining usability.

---

## Troubleshooting

### Issue: High false-negative rate (users keep failing)

**Solution:**

1. Ensure recording duration is 10-15 seconds
2. Check audio quality (no background noise)
3. Lower threshold slightly to 0.72
4. Ask users to speak more clearly

### Issue: Low false-positive rate (attackers can pass)

**Solution:**

1. Increase threshold to 0.78-0.80
2. Require multiple successful verifications
3. Add liveness detection (speech variation)
4. Combine with other verification methods

### Issue: Voice embedding extraction fails

**Solution:**

1. Check Flask server is running (`python app.py` in voice-service/)
2. Verify audio format is WAV or WebM
3. Check microphone permissions in browser
4. Review logs: `app.logger.error()`

---

## Best Practices

1. **For Users:**

   - Record 10-15 seconds of clear speech
   - Minimize background noise
   - Speak naturally (not whispering)
   - Use same microphone for enrollment and verification

2. **For Developers:**

   - Store embeddings securely (encrypted)
   - Validate audio duration before processing
   - Monitor similarity scores to detect tampering
   - Log all verification attempts
   - Consider adding liveness detection

3. **For Security:**
   - Don't rely on voice alone (combine with other factors)
   - Rate limit verification attempts
   - Log and alert on repeated failures
   - Monitor for replay attacks

---

## Future Enhancements

1. **Liveness Detection**: Detect if audio is pre-recorded
2. **Speaker Diarization**: Identify multiple speakers
3. **Noise Robustness**: Handle background noise better
4. **Language Support**: Support multilingual embeddings
5. **Continuous Authentication**: Monitor voice during transactions
6. **Emotion Detection**: Detect stress/coercion in voice

---

## References

- Resemblyzer: https://github.com/resemble-ai/Resemblyzer
- LibriSpeech Dataset: http://www.openslr.org/12/
- Speaker Recognition: https://en.wikipedia.org/wiki/Speaker_recognition
- Cosine Similarity: https://en.wikipedia.org/wiki/Cosine_similarity

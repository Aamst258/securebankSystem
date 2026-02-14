
# Voice Verification System - Expected Answers Guide

## Security Questions and Expected Answers

When users are asked security questions, they should provide **exact** answers that match what they registered in their profile. Here are the expected formats:

### 1. "What is your nickname?"
- **Expected:** Exact nickname as stored in profile
- **Example:** If profile has "Johnny", user should say "Johnny"
- **Not:** "My nickname is Johnny" or "It's Johnny"

### 2. "What is your shoe size?"
- **Expected:** Just the number
- **Example:** If profile has "9", user should say "nine" or "9"
- **Accepted:** "9", "nine", "size 9", "nine and a half" (for 9.5)

### 3. "What is your favorite color?"
- **Expected:** Color name only
- **Example:** If profile has "blue", user should say "blue"
- **Not:** "My favorite color is blue"

### 4. "What is your birth place?"
- **Expected:** City/place name as stored
- **Example:** If profile has "New York", user should say "New York"
- **Accepted:** Minor variations like "NYC" for "New York City"

### 5. "What is your pet's name?"
- **Expected:** Pet name exactly
- **Example:** If profile has "Fluffy", user should say "Fluffy"

### 6. "What is your mother's maiden name?"
- **Expected:** Last name only
- **Example:** If profile has "Smith", user should say "Smith"

### 7. "What is the name of your first school?"
- **Expected:** School name as stored
- **Example:** If profile has "Lincoln Elementary", user should say "Lincoln Elementary"

### 8. "Who was your best childhood friend?"
- **Expected:** Friend's name
- **Example:** If profile has "Sarah", user should say "Sarah"

## Current Issues in Voice Verification:

1. **Text Similarity Threshold:** Currently set to 50% - may be too low
2. **Voice Match Required:** Both voice biometric AND text content must match
3. **Case Sensitivity:** System converts to lowercase for comparison
4. **Speech Recognition Errors:** May not capture exact words

## Recommendations for Users:
- Speak clearly and at moderate pace
- Use simple, direct answers
- Avoid extra words like "My answer is..." 
- Ensure good microphone quality
- Record in quiet environment

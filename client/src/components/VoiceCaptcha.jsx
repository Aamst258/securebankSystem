import React, { useState } from 'react';
import { apiEndpoints } from '../config/api';

function VoiceCaptcha({ question, userId, transactionId, onVerificationComplete, field, onRequestNewQuestion }) {
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [currentAttempt, setCurrentAttempt] = useState(0);  // 🟢 TRACK ATTEMPTS
    const [isMaxAttemptsReached, setIsMaxAttemptsReached] = useState(false);  // 🟢 TRACK DENIAL

    // Diagnostic data
    const [recognizedText, setRecognizedText] = useState('');
    const [similarityScore, setSimilarityScore] = useState(null);

    // Start recording voice
    const startRecording = async () => {
        if (isRecording) return;

        // Reset previous session data
        setAudioBlob(null);
        setVerificationStatus('');
        setRecognizedText('');
        setSimilarityScore(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks = [];

            recorder.ondataavailable = (event) => chunks.push(event.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            console.error("Microphone access error:", error);
            setVerificationStatus('Microphone access denied. Please check your permissions.');
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    };

    // Verify recorded audio
   const verifyResponse = async () => {
    if (!audioBlob) {
        setVerificationStatus('Please record your response first.');
        return;
    }

    setIsLoading(true);
    setVerificationStatus('Verifying...');

    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-response.webm');
        formData.append('userId', userId);
        // Only append transactionId when it's a valid value (avoid sending 'undefined')
        if (transactionId && transactionId !== 'undefined' && transactionId !== 'null') {
            formData.append('transactionId', transactionId); // 🟢 SEND TRANSACTION ID
        }
        

        // 🔹 Send only the actual field key (e.g., "birthPlace", "nickname")
        if (field) formData.append('field', field);

        // 🔹 Optional debug info, but pass only string not full object
        if (typeof question === "string") {
            formData.append('question', question);
        }
const token = localStorage.getItem("authToken");  
        console.log("📤 Sending verification data:", {
            userId,
            transactionId,
            field,
            question
        });

        const response = await fetch(apiEndpoints.verifyVoiceCaptcha, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`, // 🔥 FIXED
            },
            body: formData, // No manual Content-Type here
        });

        const data = await response.json();

        // Diagnostic data
        if (data.recognizedText) setRecognizedText(data.recognizedText);
        if (typeof data.similarity === 'number') setSimilarityScore(data.similarity);

        if (!response.ok) {
            throw new Error(data.message || 'Verification failed.');
        }

        if (data.success) {
            console.log('🎉 Voice verification successful');
            setVerificationStatus('✅ Verification successful!');
            setCurrentAttempt(data.currentAttempt);  // 🟢 UPDATE ATTEMPT COUNT
            onVerificationComplete(true, data.message || 'Voice verification passed');
        } else {
            // 🟢 UPDATE ATTEMPT COUNT FROM BACKEND
            if (data.currentAttempt) {
                setCurrentAttempt(data.currentAttempt);
            }
            
            let failureMessage = `Attempt ${data.currentAttempt}/10: Verification failed.`;
            
            // 🟢 CHECK IF TRANSACTION DENIED (MAX ATTEMPTS)
            if (data.isDenied) {
                failureMessage = `❌ Maximum 10 attempts reached. Transaction has been denied.`;
                setIsMaxAttemptsReached(true);
                console.warn('🚫 Transaction DENIED:', failureMessage);
                setVerificationStatus(failureMessage);
                onVerificationComplete(false, 'Transaction denied - maximum attempts exceeded');
            } else if (data.attemptsLeft > 0) {
                failureMessage += ` (${data.attemptsLeft} attempts left)`;
                console.warn('❌ Verification failed:', failureMessage);
                setVerificationStatus(`❌ ${failureMessage}`);

                // Immediately ask a new question if attempts left
                if (onRequestNewQuestion) {
                    setTimeout(() => {
                        console.log('🔄 Requesting new question...');
                        onRequestNewQuestion();
                    }, 1500); // Brief delay for user to see failure message
                }
            } else {
                failureMessage = 'Maximum attempts reached. Transaction denied.';
                setIsMaxAttemptsReached(true);
                console.warn('🚫 Transaction DENIED:', failureMessage);
                setVerificationStatus(`❌ ${failureMessage}`);
                onVerificationComplete(false, 'Transaction denied - maximum attempts exceeded');
            }
        }
    } catch (error) {
        console.error('⚠️ Verification Error:', error);
        setVerificationStatus(`❌ Error: ${error.message}`);
        onVerificationComplete(false, error.message);
    } finally {
        setIsLoading(false);
    }
};


    return (
        <div className="card bg-light border-primary">
            <div className="card-body text-center">
                <h5 className="card-title mb-4">🎤 Voice Verification Captcha</h5>

                {/* 🟢 DISPLAY ATTEMPT COUNTER */}
                {currentAttempt > 0 && (
                    <div className={`alert ${isMaxAttemptsReached ? 'alert-danger' : 'alert-warning'} mb-3`}>
                        <strong>Attempt {currentAttempt}/10</strong>
                        {!isMaxAttemptsReached && <span> - {10 - currentAttempt} attempts remaining</span>}
                    </div>
                )}

                {/* Captcha-style: Minimal text, no question display */}
                <div className="alert alert-warning mb-4">
                    <strong>Listen to the question above and respond with your answer</strong>
                </div>

                <div className="d-flex gap-2 mb-4 justify-content-center">
                    <button
                        className={`btn ${isRecording ? 'btn-danger' : 'btn-success'}`}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isLoading || isMaxAttemptsReached}
                    >
                        {isRecording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
                    </button>

                    {audioBlob && !isLoading && !isMaxAttemptsReached && (
                        <button className="btn btn-primary" onClick={verifyResponse}>
                            🔍 Verify Response
                        </button>
                    )}
                </div>

                {isRecording && (
                    <div className="alert alert-warning mb-3">🔴 Recording...</div>
                )}

                {verificationStatus && (
                    <div className={`alert mt-3 ${verificationStatus.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
                        {verificationStatus}
                    </div>
                )}

                {/* Show details only if user clicks */}
                <div className="mt-3">
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        {showDetails ? '🔽 Hide Details' : '🔼 Show Details'}
                    </button>
                </div>

                {showDetails && (recognizedText || similarityScore !== null) && (
                    <div className="alert alert-secondary mt-3">
                        <h6>🔎 Verification Details</h6>
                        {recognizedText && (
                            <p><b>What we heard:</b> "{recognizedText}"</p>
                        )}
                        {similarityScore !== null && (
                            <p>
                                <b>Voice Match:</b> {(similarityScore * 100).toFixed(2)}%
                                <small> (Threshold: 75%)</small>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default VoiceCaptcha;

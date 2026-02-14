import { useState, useEffect } from 'react';
import VoiceCaptcha from '../components/VoiceCaptcha';
import  {apiEndpoints } from '../config/api';

// Static question templates for transfer verification
const QUESTION_TEMPLATES = [
    { field: 'nickname', question: "What is your nickname?" },
    { field: 'shoeSize', question: "What is your shoe size?" },
    { field: 'favoriteColor', question: "What is your favorite color?" },
    { field: 'birthPlace', question: "What is your birth place?" },
    { field: 'petName', question: "What is your pet's name?" },
    { field: 'motherMaidenName', question: "What is your mother's maiden name?" },
    { field: 'firstSchool', question: "What is the name of your first school?" },
    { field: 'childhoodFriend', question: "Who was your best childhood friend?" }
];

function Transfer() {
    const [activeTab, setActiveTab] = useState('transfer');
    const [formData, setFormData] = useState({ recipient: '', amount: '' });
    const [verificationResult, setVerificationResult] = useState(null);
    const [showVoiceVerification, setShowVoiceVerification] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [transactionId, setTransactionId] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [audioPlayer, setAudioPlayer] = useState(null);
    const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);

    const userData = JSON.parse(localStorage.getItem('userData'));

    // Fetch full user profile from backend
    useEffect(() => {
        async function fetchProfile() {
            if (userData?.id) {
                try {
                    const res = await fetch(apiEndpoints.getUserProfile(userData.id));
                    const data = await res.json();
                    if (res.ok && data.success) {
                        setUserProfile(data.user);
                    } else {
                        setVerificationResult({ success: false, message: data.message || 'Failed to fetch user profile.' });
                    }
                } catch (error) {
                    setVerificationResult({ success: false, message: 'Error fetching user profile.' });
                }
            }
        }
        fetchProfile();
    }, [userData?.id]);

    const getRandomQuestion = () => {
        if (!userProfile) return null;
        const filledFields = QUESTION_TEMPLATES.filter(q => userProfile[q.field]);
        if (filledFields.length === 0) return null;
        return filledFields[Math.floor(Math.random() * filledFields.length)];
    };

    // Play question in voice using TTS
    const playQuestionVoice = async (questionText) => {
        try {
            setIsPlayingQuestion(true);
            console.log("Playing question:", questionText);
            
            const response = await fetch('http://localhost:5001/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: questionText })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch TTS audio');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create and play audio
            const audio = new Audio(audioUrl);
            setAudioPlayer(audio);
            
            audio.onended = () => {
                setIsPlayingQuestion(false);
            };
            
            audio.onerror = () => {
                console.error('Error playing audio');
                setIsPlayingQuestion(false);
            };
            
            audio.play().catch(err => {
                console.error('Error playing audio:', err);
                setIsPlayingQuestion(false);
            });
        } catch (error) {
            console.error('Error getting TTS audio:', error);
            setIsPlayingQuestion(false);
        }
    };

    // Auto-play question when it changes
    useEffect(() => {
        if (selectedQuestion && selectedQuestion.question) {
            playQuestionVoice(selectedQuestion.question);
        }
    }, [selectedQuestion]);

    // Request a new question (called when verification fails)
    const handleRequestNewQuestion = () => {
        const newQuestion = getRandomQuestion();
        if (newQuestion) {
            setSelectedQuestion(newQuestion);
            // playQuestionVoice will be triggered by useEffect
        }
    };

    const handleChange = async (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

  
        if (name === 'recipient' && value.length > 1) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${apiEndpoints.searchRecipients}?query=${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${token}` }
});

                const data = await response.json();
                if (data.success) {
                    setSearchResults(data.recipients || data.users || []);
                    setShowSearchResults(true);
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        } else if (name === 'recipient' && value.length <= 1) {
            setShowSearchResults(false);
            setSearchResults([]);
        }
    };

    const selectRecipient = (user) => {
        setSelectedRecipient(user);
        setFormData({ ...formData, recipient: user.accountNumber });
        setShowSearchResults(false);
        setSearchResults([]);
    };

    const resetForm = () => {
        setFormData({ recipient: '', amount: '' });
        setShowVoiceVerification(false);
        setVerificationResult(null);
        setSelectedQuestion(null);
        setTransactionId(null);
        setIsLoading(false);
    };

const handleVerificationComplete = async (success, message) => {
    setShowVoiceVerification(false);
    setSelectedQuestion(null);

    if (!success) {
        // 🟢 CHECK IF MESSAGE INDICATES TRANSACTION DENIAL
        if (message && message.includes('maximum attempts')) {
            setVerificationResult({ 
                success: false, 
                message: '🚫 Transaction Denied: Maximum verification attempts exceeded. Please try again later.' 
            });
        } else {
            setVerificationResult({ success: false, message: message || 'Voice verification failed.' });
        }
        resetForm();
        return;
    }

    setIsLoading(true);
    try {
        const token = localStorage.getItem("authToken");

        // Final transaction call with complete details
        const completeResponse = await fetch(apiEndpoints.completeTransaction, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                userId: userData.id,
                type: activeTab, // transfer | deposit | withdraw
                amount: parseFloat(formData.amount),
                recipient:
                    activeTab === "transfer"
                        ? (selectedRecipient ? selectedRecipient.accountNumber : formData.recipient)
                        : undefined,
            }),
        });

        const completeData = await completeResponse.json();

        if (!completeResponse.ok) {
            throw new Error(completeData.message || "Transaction failed.");
        }

        setVerificationResult({
            success: true,
            message: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} successful! New balance: ₹${completeData.newBalance?.toLocaleString("en-IN")}`,
        });
        const updatedUser = { ...userData, balance: completeData.newBalance };
localStorage.setItem("userData", JSON.stringify(updatedUser));
        setTimeout(resetForm, 4000);
    } catch (error) {
        console.error("❌ Transaction Completion Error:", error);
        setVerificationResult({ success: false, message: error.message });
    } finally {
        setIsLoading(false);
    }
};

const handleSubmit = async (e) => {
    e.preventDefault();
    setVerificationResult(null);
    const token = localStorage.getItem('authToken');

    if (!userData?.id) {
        setVerificationResult({ success: false, message: 'User not logged in.' });
        return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setVerificationResult({ success: false, message: 'Please enter a valid amount.' });
        return;
    }
    if (activeTab === 'transfer' && !formData.recipient) {
        setVerificationResult({ success: false, message: 'Please enter a recipient.' });
        return;
    }

    setIsLoading(true);
    try {
        let endpoint = '';
        if (activeTab === 'transfer') endpoint = apiEndpoints.transferMoney;
        else if (activeTab === 'deposit') endpoint = apiEndpoints.depositMoney;
        else if (activeTab === 'withdraw') endpoint = apiEndpoints.withdrawMoney;

        // Use selected recipient’s account number or direct input
        const recipientValue =
            activeTab === 'transfer'
                ? (selectedRecipient ? selectedRecipient.accountNumber : formData.recipient)
                : undefined;

        const requestBody = {
            userId: userData.id,
            amount: parseFloat(formData.amount),
            ...(activeTab === 'transfer' && { recipient: recipientValue }),
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        // FIX: Better error handling to catch 4xx/5xx responses
        if (!response.ok) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        // ✅ UPDATED: don't require transactionId for success
        if (data.success) {
            // still keep transactionId if backend sends it (for transfer or future use)
            if (data.transactionId) {
                setTransactionId(data.transactionId);
            }

            const q = getRandomQuestion();
            if (!q) {
                setVerificationResult({
                    success: false,
                    message: 'Cannot proceed. No security questions are set up on your profile.',
                });
                return;
            }

            setSelectedQuestion(q);
            setShowVoiceVerification(true);
        } else {
            setVerificationResult({
                success: false,
                message: data.message || 'Failed to initiate transaction.',
            });
        }

    } catch (error) {
        setVerificationResult({ success: false, message: error.message });
    } finally {
        setIsLoading(false);
    }
};





    const questionText = selectedQuestion ? selectedQuestion.question : 'Loading security question...';

    return (
        <div className="container mt-4 px-4">
            <h2 className="mb-4">🏦 Account Actions</h2>
            <ul className="nav nav-tabs mb-3">
                {['transfer', 'deposit', 'withdraw'].map((tab) => (
                    <li className="nav-item" key={tab}>
                        <button
                            className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab); resetForm(); }}
                            disabled={isLoading}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    </li>
                ))}
            </ul>

            {verificationResult && (
                <div className={`alert ${verificationResult.success ? 'alert-success' : 'alert-danger'}`}>
                    {verificationResult.message}
                </div>
            )}

            {showVoiceVerification ? (
                <div>
                    {/* Replay Question Button */}
                    <div className="card mb-3 bg-light">
                        <div className="card-body text-center">
                            <p className="text-muted mb-3">
                                <strong>Security Question:</strong> {questionText}
                            </p>
                            <button
                                type="button"
                                className="btn btn-outline-primary me-2"
                                onClick={() => playQuestionVoice(questionText)}
                                disabled={isPlayingQuestion}
                            >
                                {isPlayingQuestion ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Playing...
                                    </>
                                ) : (
                                    '🔊 Replay Question'
                                )}
                            </button>
                        </div>
                    </div>
                    <VoiceCaptcha
                        question={questionText}
                        field={selectedQuestion.field}
                        userId={userData?.id}
                        onVerificationComplete={handleVerificationComplete}
                        onRequestNewQuestion={handleRequestNewQuestion}
                    />
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {activeTab === 'transfer' && (
                        <div className="mb-3">
                            <label htmlFor="recipient" className="form-label">Recipient</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                id="recipient" 
                                name="recipient" 
                                value={selectedRecipient ? `${selectedRecipient.name} (${selectedRecipient.accountNumber})` : formData.recipient} 
                                onChange={handleChange} 
                                placeholder="Enter recipient name or account number" 
                                required 
                            />
                            {showSearchResults && searchResults.length > 0 && (
                                <div className="list-group mt-2">
                                    {searchResults.map((user) => (
                                        <button
                                            key={user.accountNumber}
                                            type="button"
                                            className="list-group-item list-group-item-action"
                                            onClick={() => selectRecipient(user)}
                                        >
                                            <strong>{user.name}</strong><br />
                                            <small className="text-muted">Account: {user.accountNumber}</small>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedRecipient && (
                                <small className="text-success">
                                    Selected: {selectedRecipient.name} ({selectedRecipient.accountNumber})
                                </small>
                            )}
                        </div>
                    )}
                    <div className="mb-3">
                        <label htmlFor="amount" className="form-label">Amount (₹)</label>
                        <input type="number" step="0.01" className="form-control" id="amount" name="amount" value={formData.amount} onChange={handleChange} placeholder="Enter amount" required />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isLoading || !userProfile}>
                        {isLoading ? 'Processing...' : `Proceed to Verification`}
                    </button>
                    {!userProfile && <small className="d-block mt-2 text-muted">Loading user data...</small>}
                </form>
            )}
        </div>
    );
}

export default Transfer;
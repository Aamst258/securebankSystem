import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    shoeSize: '',
    favoriteColor: '',
    birthPlace: '',
    petName: '',
    motherMaidenName: '',
    firstSchool: '',
    childhoodFriend: '',
    language: 'en'
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    capital: false,
    special: false,
    number: false
  });

  const [voiceBlob, setVoiceBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0); // in seconds
  const [timerInterval, setTimerInterval] = useState(null);
  const timerIntervalRef = useRef(null); // NEW: use ref for interval
  const mediaRecorderRef = useRef(null);
  const startTimeRef = useRef(null);

  const navigate = useNavigate();

  const validatePassword = (password) => {
    const strength = {
      length: password.length >= 8,
      capital: /[A-Z]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      number: /[0-9]/.test(password)
    };
    setPasswordStrength(strength);
    return Object.values(strength).every(Boolean);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'password') {
      validatePassword(value);
    }
  };

  const startRecording = async () => {
    setVoiceBlob(null);
    setRecordingDuration(0);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    let chunks = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setVoiceBlob(blob);
      setRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimerInterval(null); // keep state in sync
      setRecordingDuration((Date.now() - startTimeRef.current) / 1000);
      // Stop all tracks to release the mic
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    setRecording(true);
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setRecordingDuration((Date.now() - startTimeRef.current) / 1000);
    }, 100);
    timerIntervalRef.current = interval;
    setTimerInterval(interval);

    // Auto-stop after 15 seconds (optimal for voice embedding quality)
    setTimeout(() => {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    }, 15000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimerInterval(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!validatePassword(formData.password)) {
      setError('Password does not meet the requirements');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (!voiceBlob) {
      setError('Please record your voice for secure registration.');
      setIsLoading(false);
      return;
    }

    try {
      const voiceForm = new FormData();
      voiceForm.append('voice', voiceBlob);
      voiceForm.append('email', formData.email);
      voiceForm.append('duration', recordingDuration); // Optionally send duration

      const voiceRes = await fetch('http://localhost:5000/api/voice/register', {
        method: 'POST',
        body: voiceForm,
      });

      const voiceData = await voiceRes.json();
      if (!voiceData.success) throw new Error('Voice registration failed');

      const res = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          voiceprintId: voiceData.voiceprintId,
          voiceEmbedding: voiceData.embedding
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('userData', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError(err.message || 'Server error');
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordStrengthIndicator = () => (
    <div className="mt-2">
      <small className="text-muted d-block mb-1">Password must contain:</small>
      <div className="row g-1">
        <div className="col-6">
          <small className={`d-flex align-items-center ${passwordStrength.length ? 'text-success' : 'text-muted'}`}>
            <i className={`fas ${passwordStrength.length ? 'fa-check' : 'fa-times'} me-1`}></i>
            8+ characters
          </small>
        </div>
        <div className="col-6">
          <small className={`d-flex align-items-center ${passwordStrength.capital ? 'text-success' : 'text-muted'}`}>
            <i className={`fas ${passwordStrength.capital ? 'fa-check' : 'fa-times'} me-1`}></i>
            One uppercase
          </small>
        </div>
        <div className="col-6">
          <small className={`d-flex align-items-center ${passwordStrength.special ? 'text-success' : 'text-muted'}`}>
            <i className={`fas ${passwordStrength.special ? 'fa-check' : 'fa-times'} me-1`}></i>
            Special character
          </small>
        </div>
        <div className="col-6">
          <small className={`d-flex align-items-center ${passwordStrength.number ? 'text-success' : 'text-muted'}`}>
            <i className={`fas ${passwordStrength.number ? 'fa-check' : 'fa-times'} me-1`}></i>
            One number
          </small>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100 bg-light w-100" style={{ margin: 0, padding: 0 }}>
      <div className="w-100" style={{ margin: 0, padding: 0 }}>
        <div className="row justify-content-center m-0">
          <div className="col-12 px-0">
            <div className="card shadow-lg border-0 w-100 rounded-0" style={{ minHeight: "100vh", margin: 0 }}>
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">Create Your Account</h2>
                  <p className="text-muted">Join SecureBank for protected banking with voice verification</p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="name" className="form-label fw-semibold">Full Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label fw-semibold">Email Address *</label>
                      <input
                        type="email"
                        className="form-control form-control-lg"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="password" className="form-label fw-semibold">Password *</label>
                      <div className="position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-control form-control-lg pe-5"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Create a strong password"
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ border: 'none', background: 'none' }}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      <PasswordStrengthIndicator />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="confirmPassword" className="form-label fw-semibold">Confirm Password *</label>
                      <div className="position-relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="form-control form-control-lg pe-5"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm your password"
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{ border: 'none', background: 'none' }}
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-top pt-4 mt-4">
                    <h5 className="mb-3 text-primary">🎤 Voice Security Information</h5>
                    <p className="text-muted small mb-4">This information will be used to generate personalized voice verification questions</p>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="nickname" className="form-label">Nickname</label>
                        <input
                          type="text"
                          className="form-control"
                          id="nickname"
                          name="nickname"
                          value={formData.nickname}
                          onChange={handleChange}
                          placeholder="What do friends call you?"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="shoeSize" className="form-label">Shoe Size</label>
                        <input
                          type="text"
                          className="form-control"
                          id="shoeSize"
                          name="shoeSize"
                          value={formData.shoeSize}
                          onChange={handleChange}
                          placeholder="e.g., 9, 10.5"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="favoriteColor" className="form-label">Favorite Color</label>
                        <input
                          type="text"
                          className="form-control"
                          id="favoriteColor"
                          name="favoriteColor"
                          value={formData.favoriteColor}
                          onChange={handleChange}
                          placeholder="e.g., Blue, Red"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="birthPlace" className="form-label">Birth Place</label>
                        <input
                          type="text"
                          className="form-control"
                          id="birthPlace"
                          name="birthPlace"
                          value={formData.birthPlace}
                          onChange={handleChange}
                          placeholder="City where you were born"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="petName" className="form-label">Pet Name</label>
                        <input
                          type="text"
                          className="form-control"
                          id="petName"
                          name="petName"
                          value={formData.petName}
                          onChange={handleChange}
                          placeholder="Current or childhood pet"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="motherMaidenName" className="form-label">Mother's Maiden Name</label>
                        <input
                          type="text"
                          className="form-control"
                          id="motherMaidenName"
                          name="motherMaidenName"
                          value={formData.motherMaidenName}
                          onChange={handleChange}
                          placeholder="Mother's maiden name"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="firstSchool" className="form-label">First School</label>
                        <input
                          type="text"
                          className="form-control"
                          id="firstSchool"
                          name="firstSchool"
                          value={formData.firstSchool}
                          onChange={handleChange}
                          placeholder="Your first school name"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="childhoodFriend" className="form-label">Childhood Friend</label>
                        <input
                          type="text"
                          className="form-control"
                          id="childhoodFriend"
                          name="childhoodFriend"
                          value={formData.childhoodFriend}
                          onChange={handleChange}
                          placeholder="Best childhood friend"
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="language" className="form-label">Preferred Language</label>
                        <select
                          className="form-select"
                          id="language"
                          name="language"
                          value={formData.language}
                          onChange={handleChange}
                        >
                          <option value="en">English</option>
                          <option value="hi">Kannada</option>
                          <option value="es">Telugu</option>
                          <option value="fr">Hindi</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">🎤 Voice Registration</label>
                      <p className="text-muted small mb-2">
                        Record 10-15 seconds of clear speech for better voice recognition accuracy. 
                        You can say anything or answer a security question.
                      </p>
                      <button type="button" onClick={recording ? stopRecording : startRecording} className="btn btn-outline-secondary">
                        {recording ? '⏹️ Stop Recording' : '🎙️ Record Voice'}
                      </button>
                      {recording && (
                        <div className="mt-2 text-primary">
                          <span>🔴 Recording... {recordingDuration.toFixed(1)}s / 15s</span>
                          <div className="progress mt-2" style={{ height: '5px' }}>
                            <div
                              className="progress-bar bg-danger"
                              role="progressbar"
                              style={{ width: `${(recordingDuration / 15) * 100}%` }}
                              aria-valuenow={recordingDuration}
                              aria-valuemin="0"
                              aria-valuemax="15"
                            ></div>
                          </div>
                        </div>
                      )}
                      {voiceBlob && !recording && (
                        <>
                          <div className="mt-2 text-success">✅ Voice recorded successfully ({recordingDuration.toFixed(1)}s)</div>
                          <audio
                            className="mt-2"
                            src={URL.createObjectURL(voiceBlob)}
                            controls
                          />
                          <p className="text-muted small mt-2">
                            <i className="fas fa-info-circle me-1"></i>
                            Quality: {recordingDuration < 10 ? '⚠️ Minimum' : recordingDuration < 15 ? '✅ Good' : '⭐ Excellent'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg w-100 mt-4" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating Account...
                      </>
                    ) : (
                      '🔒 Create Secure Account'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
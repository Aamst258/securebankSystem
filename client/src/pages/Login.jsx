import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/auth';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetMessage('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetMessage('Password reset instructions sent to your email!');
        setResetEmail('');
      } else {
        setResetMessage(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      setResetMessage('Server error. Please try again.');
    }
  };

  return (
    <div className="min-vh-100 bg-light w-100" style={{ margin: 0, padding: 0 }}>
      <div className="w-100" style={{ margin: 0, padding: 0 }}>
        <div className="row justify-content-center m-0">
          <div className="col-12 px-0">
            <div className="card shadow-lg border-0 w-100 rounded-0" style={{ minHeight: "100vh", margin: 0 }}>
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">Welcome Back</h2>
                  <p className="text-muted">Sign in to your SecureBank account</p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                {!showForgotPassword ? (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label fw-semibold">Email Address</label>
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
                    
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label fw-semibold">Password</label>
                      <div className="position-relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          className="form-control form-control-lg pe-5" 
                          id="password" 
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Enter your password" 
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
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="rememberMe" />
                        <label className="form-check-label text-muted" htmlFor="rememberMe">
                          Remember me
                        </label>
                      </div>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-primary text-decoration-none"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    
                    <button type="submit" className="btn btn-primary btn-lg w-100 mb-3" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>
                ) : (
                  <div>
                    <div className="text-center mb-4">
                      <h4 className="fw-bold">Reset Password</h4>
                      <p className="text-muted">Enter your email to receive reset instructions</p>
                    </div>
                    
                    {resetMessage && (
                      <div className={`alert ${resetMessage.includes('sent') ? 'alert-success' : 'alert-danger'}`}>
                        {resetMessage}
                      </div>
                    )}
                    
                    <form onSubmit={handleForgotPassword}>
                      <div className="mb-3">
                        <label htmlFor="resetEmail" className="form-label fw-semibold">Email Address</label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          id="resetEmail"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      
                      <button type="submit" className="btn btn-primary btn-lg w-100 mb-3">
                        Send Reset Instructions
                      </button>
                      
                      <button
                        type="button"
                        className="btn btn-link w-100 text-center"
                        onClick={() => setShowForgotPassword(false)}
                      >
                        Back to Login
                      </button>
                    </form>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-muted mb-0">Don't have an account? 
                    <Link to="/signup" className="text-primary text-decoration-none fw-semibold"> Sign up here</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

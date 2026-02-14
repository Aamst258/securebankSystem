import { useState, useEffect } from 'react';
import { useAuth } from '../auth/auth';

function Settings() {
  const { user, logout } = useAuth();
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    nickname: '',
    shoeSize: '',
    favoriteColor: '',
    birthPlace: '',
    petName: '',
    language: 'en'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.name || '',
        email: user.email || '',
        nickname: '',
        shoeSize: '',
        favoriteColor: '',
        birthPlace: '',
        petName: '',
        language: user.language || 'en'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setUserProfile({ ...userProfile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // In a real app, you'd update the user profile here
      setTimeout(() => {
        setMessage('Profile updated successfully!');
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      setMessage('Failed to update profile.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <h2>Account Settings ⚙️</h2>
          <p className="text-muted">Manage your profile and security preferences</p>

          {message && (
            <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'}`}>
              {message}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h5>Profile Information</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="name" className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={userProfile.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={userProfile.email}
                      onChange={handleChange}
                      required
                      disabled
                    />
                  </div>
                </div>

                <hr />
                <h6>Voice Security Information</h6>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="nickname" className="form-label">Nickname</label>
                    <input
                      type="text"
                      className="form-control"
                      id="nickname"
                      name="nickname"
                      value={userProfile.nickname}
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
                      value={userProfile.shoeSize}
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
                      value={userProfile.favoriteColor}
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
                      value={userProfile.birthPlace}
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
                      value={userProfile.petName}
                      onChange={handleChange}
                      placeholder="Current or childhood pet"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="language" className="form-label">Preferred Language</label>
                    <select
                      className="form-control"
                      id="language"
                      name="language"
                      value={userProfile.language}
                      onChange={handleChange}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </form>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <h5>Account Actions</h5>
            </div>
            <div className="card-body">
              <button className="btn btn-outline-danger" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Settings;
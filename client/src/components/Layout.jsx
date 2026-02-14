
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth';
import Footer from './Footer';

function Layout({ children }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container">
          <Link className="navbar-brand" to="/">SecureBank</Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            {user ? (
              <>
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                  <li className="nav-item">
                    <Link className="nav-link" to="/dashboard">Dashboard</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/transactions">Transactions</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/transfer">Transfer</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/settings">Settings</Link>
                  </li>
                </ul>
                <ul className="navbar-nav ms-auto">
                  <li className="nav-item">
                    <span className="navbar-text me-3">Welcome, {user.name}</span>
                  </li>
                  <li className="nav-item">
                    <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
                  </li>
                </ul>
              </>
            ) : (
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/signup">Signup</Link>
                </li>
              </ul>
            )}
          </div>
        </div>
      </nav>

      {/* Main content with flex-grow to push footer down */}
      <main className="flex-grow-1" style={{ paddingTop: '76px' }}>
        <div className="container">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Layout;

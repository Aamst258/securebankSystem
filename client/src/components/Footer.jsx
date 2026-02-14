function Footer() {
  return (
    <footer className="bg-dark text-light py-4 mt-5 w-100" style={{ margin: 0, padding: 0 }}>
      <div className="w-100" style={{ margin: 0, padding: 0 }}>
        <div className="row m-0">
          <div className="col-md-6">
            <h5>SecureBank</h5>
            <p className="mb-2">Your trusted partner in secure banking with advanced voice verification technology.</p>
            <small>&copy; 2024 SecureBank. All rights reserved.</small>
          </div>
          <div className="col-md-3">
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="/dashboard" className="text-light text-decoration-none">Dashboard</a></li>
              <li><a href="/transactions" className="text-light text-decoration-none">Transactions</a></li>
              <li><a href="/transfer" className="text-light text-decoration-none">Transfer</a></li>
              <li><a href="/settings" className="text-light text-decoration-none">Settings</a></li>
            </ul>
          </div>
          <div className="col-md-3">
            <h6>Security</h6>
            <ul className="list-unstyled">
              <li className="text-light">🎤 Voice CAPTCHA</li>
              <li className="text-light">🔒 AI-Powered Security</li>
              <li className="text-light">🌍 Multilingual Support</li>
              <li className="text-light">🛡️ Advanced Encryption</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

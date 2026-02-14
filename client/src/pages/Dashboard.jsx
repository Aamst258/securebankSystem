import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth';

function Dashboard() {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?._id) {
      fetchUserDetails(user._id);
      fetchRecentTransactions();
    }
    // eslint-disable-next-line
  }, [user]);

 const fetchUserDetails = async (userId) => {
  try {
    const token = localStorage.getItem("authToken");
    console.log("Fetching user details for userId:", userId);
    const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("User details response:", data);
    
    if (res.ok && data.success) {
      console.log("Setting user details:", data.user);
      setUserDetails(data.user);

      // 🔥 Ensure latest balance is also reflected globally
      localStorage.setItem("userData", JSON.stringify(data.user));  
    } else {
      console.error("Failed to fetch user details:", data.message);
    }
  } catch (err) {
    console.error("Error fetching user details:", err);
  }
};


  const fetchRecentTransactions = async () => {
    if (!user?._id) {
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      console.log("Fetching transactions for userId:", user._id);
      const response = await fetch(`http://localhost:5000/api/transactions/${user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Transactions response status:", response.status);
      const data = await response.json();
      console.log("Transactions data:", data);
      if (data.success) {
        console.log("Setting transactions:", data.transactions);
        setTransactions(data.transactions.slice(0, 5));
      } else {
        console.error("Failed to fetch transactions:", data.message);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate monthly spending (transfers + withdrawals from current month only)
  const calculateMonthlySpending = () => {
    if (!transactions || transactions.length === 0) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Sum only transfer and withdraw transactions from current month with completed status
    const monthlySpending = transactions.reduce((sum, transaction) => {
      const transactionDate = new Date(transaction.createdAt);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();
      
      // Check if transaction is from current month
      if (transactionMonth === currentMonth && transactionYear === currentYear) {
        // Only count transfer and withdraw types with completed status
        if ((transaction.type === 'transfer' || transaction.type === 'withdraw') && transaction.status === 'completed') {
          return sum + (transaction.amount || 0);
        }
      }
      return sum;
    }, 0);
    
    return monthlySpending;
  };

  return (
    <div className="container mt-4 px-4">
      <div className="row">
        <div className="col-12">
          <h2>Welcome back, {userDetails?.name || user?.name}! 👋</h2>
          <p className="text-muted">
            Account No: <strong>{userDetails?.accountNumber || user?.accountNumber || 'Not available'}</strong>
          </p>
          <p className="text-muted">Your secure banking dashboard</p>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h5 className="card-title">💰 Account Balance</h5>
              <h3>₹{(userDetails?.balance ?? user?.balance ?? 0).toLocaleString('en-IN')}</h3>

              <small>Available Balance</small>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-success text-white">
            <div className="card-body">
              <h5 className="card-title">📊 This Month</h5>
              <h3>₹{calculateMonthlySpending().toLocaleString('en-IN')}</h3>
              <small>Total Spent (Transfers & Withdrawals)</small>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-info text-white">
            <div className="card-body">
              <h5 className="card-title">🔒 Security Level</h5>
              <h3>High</h3>
              <small>Voice-Verified</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Quick Actions</h5>
            </div>
            <div className="card-body">
              <Link to="/transfer" className="btn btn-primary me-2 mb-2">💸 Transfer Money</Link>
              <Link to="/transactions" className="btn btn-outline-primary me-2 mb-2">📋 View All Transactions</Link>
              <Link to="/settings" className="btn btn-outline-secondary mb-2">⚙️ Account Settings</Link>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Recent Transactions</h5>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="text-center">Loading...</div>
              ) : transactions.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {transactions.map((transaction) => {
                    // Determine display based on transaction type
                    let label = '';
                    let otherParty = '';
                    
                    if (transaction.type === 'transfer') {
                      const isSender = transaction.userId?._id === user?.id;
                      label = isSender ? 'TO' : 'FROM';
                      otherParty = isSender 
                        ? (transaction.recipientName || transaction.recipient?.name || 'Unknown')
                        : (transaction.userId?.name || 'Unknown');
                    } else if (transaction.type === 'deposit') {
                      label = 'DEPOSIT';
                      otherParty = 'Bank';
                    } else if (transaction.type === 'withdraw') {
                      label = 'WITHDRAW';
                      otherParty = 'Bank';
                    }
                    
                    return (
                      <li key={transaction._id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <small className="text-muted">{label}</small>
                          <br />
                          <strong>{otherParty}</strong>
                        </div>
                        <span className={`badge ${transaction.status === 'completed' ? 'bg-success' : transaction.status === 'denied' ? 'bg-danger' : 'bg-warning'}`}>
                          ₹{transaction.amount?.toLocaleString('en-IN')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-muted">No recent transactions</p>
              )}
              {transactions.length > 0 && (
                <Link to="/transactions" className="btn btn-sm btn-outline-primary mt-2">View All</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
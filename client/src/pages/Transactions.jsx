import { useState, useEffect } from 'react';
import { useAuth } from '../auth/auth';

function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteLoading, setDeleteLoading] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

 const fetchTransactions = async () => {
  try {
    const token = localStorage.getItem("authToken"); // 🔹 Get token

    const response = await fetch(
      `http://localhost:5000/api/transactions/${user?.id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // 🔥 Required for authentication
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      setTransactions(data.transactions);
    } else {
      console.error("Failed to fetch transactions:", data.message);
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
  } finally {
    setIsLoading(false);
  }
};


  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      approved: 'bg-success',
      denied: 'bg-danger',
      pending: 'bg-warning text-dark',
      completed: 'bg-success'
    };
    return badges[status] || 'bg-secondary';
  };

  const deleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
     const token = localStorage.getItem("authToken");
    setDeleteLoading(prev => ({ ...prev, [transactionId]: true }));

    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${transactionId}`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`, // 🔥 Added access token
  },
  body: JSON.stringify({ userId: user?.id }),
});

      const data = await response.json();

      if (data.success) {
        setTransactions(prev => prev.filter(t => t._id !== transactionId));
      } else {
        alert(data.message || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction');
    } finally {
      setDeleteLoading(prev => ({ ...prev, [transactionId]: false }));
    }
  };

  return (
    <div className="container mt-4 px-4">
      <div className="row">
        <div className="col-12">
          <h2>Transaction History 📋</h2>
          <p className="text-muted">View all your banking transactions</p>
        </div>
      </div>

      <div className="row mt-3">
        <div className="col-md-6">
          <div className="btn-group" role="group">
            <button 
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`btn ${filter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button 
              className={`btn ${filter === 'denied' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setFilter('denied')}
            >
              Denied
            </button>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          {isLoading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Recipient</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => {
                        // Determine display based on transaction type
                        let displayLabel = '';
                        let displayName = '';
                        
                        if (transaction.type === 'transfer') {
                          const isSender = transaction.userId?._id === user?.id;
                          displayLabel = isSender ? 'Sent' : 'Received';
                          displayName = isSender 
                            ? (transaction.recipientName || transaction.recipient?.name || 'Unknown')
                            : (transaction.userId?.name || 'Unknown');
                        } else if (transaction.type === 'deposit') {
                          displayLabel = 'Deposit';
                          displayName = 'Bank';
                        } else if (transaction.type === 'withdraw') {
                          displayLabel = 'Withdraw';
                          displayName = 'Bank';
                        }
                        
                        return (
                          <tr key={transaction._id}>
                            <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                            <td className="text-capitalize">{displayLabel}</td>
                            <td>{displayName}</td>
                            <td>₹{transaction.amount?.toLocaleString('en-IN')}</td>
                            <td>
                              <span className={`badge ${getStatusBadge(transaction.status)}`}>
                                {transaction.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {transaction.status !== 'completed' && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => deleteTransaction(transaction._id)}
                                  disabled={deleteLoading[transaction._id]}
                                >
                                  {deleteLoading[transaction._id] ? 'Deleting...' : 'Delete'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-info text-center">
              <h4>No transactions found</h4>
              <p>No transactions match the selected filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default Transactions;
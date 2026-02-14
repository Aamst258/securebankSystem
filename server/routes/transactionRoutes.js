const express = require("express");
const router = express.Router();
const {
  transferMoney,
  deposit,
  withdraw,
  completeTransaction,
  getTransactions,
  searchRecipients,
  deleteTransaction,
} = require("../controllers/transactionController");
const { authenticateToken } = require("../middleware/auth");

// Transfer
router.post("/transfer", authenticateToken, transferMoney);

// Deposit
router.post("/deposit", authenticateToken, deposit);

// Withdraw
router.post("/withdraw", authenticateToken, withdraw);

// Complete after voice verification
router.post("/complete", authenticateToken, completeTransaction);

// Search recipients
router.get("/search-recipients", authenticateToken, searchRecipients);

// Get transactions
router.get("/:userId", authenticateToken, getTransactions);

// Delete transaction
router.delete("/:id", authenticateToken, deleteTransaction);

module.exports = router;

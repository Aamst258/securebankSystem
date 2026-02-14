const User = require("../models/User");
const Transaction = require("../models/Transaction");

// Initiate transfer (ONLY check validity, do not create DB record)
const transferMoney = async (req, res) => {
  try {
    const { userId, recipient, amount } = req.body;
    if (!userId || !amount || !recipient)
      return res.status(400).json({ success: false, message: "Missing data" });

    const sender = await User.findById(userId);
    if (!sender)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (sender.balance < amount)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });

    const recipientUser = await User.findOne({ accountNumber: recipient });
    if (!recipientUser)
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });

    // ✔ Do NOT create transaction now
    return res.json({
      success: true,
      message: "Transfer validation passed. Proceed with voice verification.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Deposit (only verify amount)
const deposit = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount)
      return res.status(400).json({ success: false, message: "Missing data" });

    // ✔ No DB write yet
    return res.json({
      success: true,
      message: "Deposit validation passed. Proceed with voice verification.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Withdraw (only verify)
const withdraw = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount)
      return res.status(400).json({ success: false, message: "Missing data" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.balance < amount)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient funds" });

    // ✔ No DB save yet
    return res.json({
      success: true,
      message: "Withdrawal validation passed. Proceed with voice verification.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟢 Create only AFTER VOICE VERIFICATION SUCCESS
const completeTransaction = async (req, res) => {
  try {
    const { userId, type, amount, recipient } = req.body;
    if (!userId || !type || !amount)
      return res
        .status(400)
        .json({ success: false, message: "Missing required data" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    let recipientUser = null;

    if (type === "transfer") {
      if (!recipient)
        return res
          .status(400)
          .json({ success: false, message: "Missing recipient" });

      recipientUser = await User.findOne({ accountNumber: recipient });
      if (!recipientUser)
        return res
          .status(404)
          .json({ success: false, message: "Recipient not found" });

      user.balance -= amount;
      recipientUser.balance += amount;
      await recipientUser.save();
    } else if (type === "deposit") {
      user.balance += amount;
    } else if (type === "withdraw") {
      if (user.balance < amount)
        return res
          .status(400)
          .json({ success: false, message: "Insufficient funds" });

      user.balance -= amount;
    }

    await user.save();

    // 🟢 Now store transaction in DB
    const transaction = await Transaction.create({
      userId,
      type,
      amount,
      recipient: recipientUser?._id || null,
      recipientAccountNumber: recipientUser?.accountNumber || null,
      recipientName: recipientUser?.name || null,
      status: "completed",
    });

    return res.json({
      success: true,
      message: `${type} completed successfully`,
      newBalance: user.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get transactions (both sent and received)
const getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });

    // Get both sent transactions (userId is sender) and received transactions (recipient is receiver)
    const transactions = await Transaction.find({
      $or: [
        { userId: userId }, // Transactions sent by this user
        { recipient: userId }, // Transactions received by this user
      ],
    })
      .populate("userId", "name accountNumber") // Populate sender info
      .populate("recipient", "name accountNumber") // Populate recipient info
      .sort({ createdAt: -1 });

    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search recipients
const searchRecipients = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.userId;

    if (!query || query.length < 2)
      return res.json({ success: true, recipients: [] });

    const users = await User.find({
      _id: { $ne: currentUserId },
      name: { $regex: query, $options: "i" },
    }).select("name accountNumber");

    res.json({ success: true, recipients: users });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error searching recipients" });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction)
      return res.status(404).json({
        success: false,
        message: "Transaction not found or unauthorized",
      });

    if (transaction.status === "completed")
      return res.status(400).json({
        success: false,
        message: "Cannot delete completed transactions",
      });

    await Transaction.findByIdAndDelete(id);
    res.json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  transferMoney,
  deposit,
  withdraw,
  completeTransaction,
  getTransactions,
  searchRecipients,
  deleteTransaction,
};

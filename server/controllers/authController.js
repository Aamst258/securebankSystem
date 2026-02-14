const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      nickname,
      shoeSize,
      favoriteColor,
      birthPlace,
      petName,
      motherMaidenName,
      firstSchool,
      childhoodFriend,
      language,
      voiceprintId,
      voiceEmbedding,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // ✅ Generate unique 12-digit account number
    const generateAccountNumber = async () => {
      const randomNumber = () =>
        Math.floor(100000000000 + Math.random() * 900000000000).toString();
      let accountNumber;
      let exists = true;

      while (exists) {
        accountNumber = randomNumber();
        const existing = await User.findOne({ accountNumber });
        if (!existing) exists = false;
      }

      return accountNumber;
    };

    const newAccountNumber = await generateAccountNumber();

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userProfile = new User({
      email,
      name,
      password: hashedPassword,
      nickname,
      shoeSize,
      favoriteColor,
      birthPlace,
      petName,
      motherMaidenName,
      firstSchool,
      childhoodFriend,
      language: language || "en",
      accountNumber: newAccountNumber, // assign account number
      voiceprintId,
      voiceEmbedding: voiceEmbedding || [],
    });

    await userProfile.save();

    const activityLog = new ActivityLog({
      userId: userProfile._id,
      action: "User Registration",
      details: "New user account created",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });
    await activityLog.save();

    userProfile.activityLogs.push(activityLog._id);
    await userProfile.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: userProfile._id,
        name: userProfile.name,
        email: userProfile.email,
        language: userProfile.language,
        balance: userProfile.balance,
        accountNumber: userProfile.accountNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    user.lastLogin = new Date();
    await user.save();

    const activityLog = new ActivityLog({
      userId: user._id,
      action: "User Login",
      details: "User logged in successfully",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });
    await activityLog.save();

    user.activityLogs.push(activityLog._id);
    await user.save();

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        language: user.language,
        balance: user.balance,
        accountNumber: user.accountNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log reset request
    const activityLog = new ActivityLog({
      userId: user._id,
      action: "Password Reset Requested",
      details: `Reset requested for email ${email}`,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });
    await activityLog.save();

    user.activityLogs.push(activityLog._id);
    await user.save();

    console.log(`Password reset requested for: ${email}`);

    res.json({
      message: "Password reset instructions sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const logout = async (req, res) => {
  try {
    // Optional: log logout
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.decode(token);

    if (decoded?.userId) {
      const activityLog = new ActivityLog({
        userId: decoded.userId,
        action: "User Logout",
        details: "User logged out",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      await activityLog.save();

      await User.findByIdAndUpdate(decoded.userId, {
        $push: { activityLogs: activityLog._id },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logout successful. Please delete the token on the client.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup, login, forgotPassword, logout };

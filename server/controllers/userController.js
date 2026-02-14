const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove sensitive/uneditable fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.balance;
    delete updateData.accountNumber;
    delete updateData.activityLogs;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Log the activity
    const activityLog = new ActivityLog({
      userId,
      action: "Profile Update",
      details: "User profile updated",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });
    await User.findByIdAndUpdate(userId, {
      $push: { activityLogs: activityLog._id },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const activities = await ActivityLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      success: true,
      activities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUserProfile, updateUserProfile, getUserActivity };

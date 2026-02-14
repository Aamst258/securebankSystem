const mongoose = require("mongoose");

// Generate unique account number
const generateAccountNumber = () => {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  accountNumber: {
    type: String,
    unique: true,
    default: generateAccountNumber,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Security info
  nickname: String,
  shoeSize: String,
  favoriteColor: String,
  birthPlace: String,
  petName: String,
  motherMaidenName: String,
  firstSchool: String,
  childhoodFriend: String,

  voiceprintId: String,
  voiceEmbedding: {
    type: [Number],
    default: [],
  },
  language: { type: String, default: "en" },

  // Banking info
  isActive: { type: Boolean, default: true },
  lastLogin: Date,

  // Security Statistics
  voiceVerificationStats: {
    totalAttempts: { type: Number, default: 0 },
    successfulAttempts: { type: Number, default: 0 },
    failedAttempts: { type: Number, default: 0 },
    lastSuccessfulVerification: Date,
    averageSimilarityScore: { type: Number, default: 0 },
    securityLevel: {
      type: String,
      enum: ["low", "medium", "high", "very_high"],
      default: "medium",
    },
  },

  recipients: [
    {
      name: String,
      accountNumber: String,
      addedAt: { type: Date, default: Date.now },
    },
  ],

  // 🔗 References
  transactions: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
  activityLogs: [{ type: Schema.Types.ObjectId, ref: "ActivityLog" }],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    creator: String,
    fullAccName: String,
    accName: String,
    puuid: String,
    matchesId: Array,
    stats: Object,
    joinTime: Number,
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);

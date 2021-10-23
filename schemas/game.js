const mongoose = require("mongoose")

module.exports = mongoose.model('game', new mongoose.Schema({
  _id: String,
  name: String,
  players: [String],
  familyFriendly: Boolean
}))

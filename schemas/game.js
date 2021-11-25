const mongoose = require("mongoose")

module.exports = mongoose.model('game', new mongoose.Schema({
  _id: String,
  name: String,
  players: [String],
  familyFriendly: Boolean,
  questions: [{
    id: Number,
    x: Boolean,
    prompt: String,
    users: [String],
    answers: [{user: String, a: String}],
    votes: [{answer: Number, user: String}]
  }],
  phase: { type: String, default: 'lobby' },
  points: { type: Map, of: Number}
}))

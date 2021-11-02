const mongoose = require("mongoose")
const GameModel = require("./game")

module.exports = mongoose.model('game', new mongoose.Schema(GameModel.schema, {
    collection: 'replays'
}))
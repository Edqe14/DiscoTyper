const mongoose = require('mongoose');

const schema = mongoose.Schema({
  code: String,
  players: Array,
  owner: String
});

module.exports = mongoose.model('Games', schema);

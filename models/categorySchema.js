const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  category: {
    type: String,
  }
});

module.exports = categorySchema = mongoose.model('Category', CategorySchema,"Categories");

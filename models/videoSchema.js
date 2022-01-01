const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VideoSchema = new Schema({
  name:{
    type: String
  },
  description: {
    type: String,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categories"
  },
  creator:{
    type:Schema.Types.ObjectId,
    ref:"User"
  },
  ThumbnailFileID: {
    type: Schema.Types.ObjectId, // There is no need to create references here
  },
  VideoFileID: {
    type: Schema.Types.ObjectId, // There is no need to create references here
  },
});

module.exports = videoSchema = mongoose.model(
  "video",
  VideoSchema,
  "VideoCollection"
);

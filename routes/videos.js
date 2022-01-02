const express = require("express");
const videoStream = require("../controllers/videoStream");
const router = express.Router({ mergeParams: true });
const fileUploadHandler = require("../util/FileUploadHandler");
const videoSchema = require("../models/videoSchema");
const categorySchema = require("../models/categorySchema");
const checkAuth = require("../middleware/check-auth");

// get /cat-videos/:movieId
//router.get('/:movieId',videoStream);
//router.get("/vids",videoStream.getVideosByCategory);

router.use(checkAuth);
router.delete("/videos/:id", videoStream.deleteVideo);
router.get("/myvideos", videoStream.getVideosByCreator);
router.get("/videos", videoStream.getVideos);
router.get("/videos/:id", videoStream.getVideoStream);
router.get("/videos/thumbnail/:id", videoStream.getThumbnailStream);

router.delete("/videos/:id", videoStream.deleteVideo);

router
  .get("/categories", videoStream.getCategories)
  .delete("/videos/:id", videoStream.getVideoStream);
router.post(
  "/upload",
  fileUploadHandler.fields([
    { name: "file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    const categoryID = await categorySchema.findOne({
      category: req.body.category,
    });
    console.log({
      name: req.body.name,
      description: req.body.description,
      category: categoryID._id,
      creator: req.body.userId,
      ThumbnailFileID: req.files.thumbnail[0].id,
      VideoFileID: req.files.file[0].id,
    });
    const newVideo = new videoSchema({
      name: req.body.name,
      description: req.body.description,
      category: categoryID._id,
      creator: req.body.userId,
      ThumbnailFileID: req.files.thumbnail[0].id,
      VideoFileID: req.files.file[0].id,
    });
    newVideo.save();
    res.json({ message: "file", file: req.files });
  }
);

module.exports = router;

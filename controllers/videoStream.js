const mongoose = require("mongoose");
const mongodb = require("mongodb");
const { getDataBaseConnection } = require("../util/database.js");
const categorySchema = require("../models/categorySchema");
const videoSchema = require("../models/videoSchema");
const HttpError = require("../models/http-error");

let streamCounter = 0;

exports.getVideos = async (req, res, next) => {
  try {
    let category_list = await categorySchema.find({});
    let videosByCategory = [];
    await Promise.all(
      category_list.map(async (category) => {
        let video = await videoSchema.find({ category: category._id });
        if (video.length > 0) {
          videosByCategory.push({ [category.category]: video });
        }
      })
    );
    res.json(videosByCategory);
  } catch {
    res.status(404).json({ message: "Could not find" });
  }
};
exports.getVideosByCategory = async (req, res, next) => {
  try {
    let videosByCategory = await videoSchema.find({
      category: mongoose.Types.ObjectId(req.params.id),
    });
    console.log(req.params.id);
    res.json(videosByCategory);
  } catch {
    res.status(404).json({ message: "Could not find" });
  }
};
exports.getThumbnailStream = async (req, res, next) => {
  let uId = req.params.id;
  const DBConn = getDataBaseConnection("getThumbnailStream");
  DBConn().gfs.collection("Thumbnails");
  DBConn().gfs.files.findOne(
    { _id: mongoose.Types.ObjectId(req.params.id) },
    (err, file) => {
      if (err) {
        return res.status(400).send({
          err: errorHandler.getErrorMessage(err),
        });
      }
      if (!file) {
        return res.status(404).send({
          err: "Not Found",
        });
      }
      // GridFS Collection
      //console.log(file);
      const bucket = new mongodb.GridFSBucket(mongoose.connection.db, {
        bucketName: "Thumbnails",
      });

      const downloadStream = bucket.openDownloadStream(
        mongoose.Types.ObjectId(uId)
      );

      downloadStream.pipe(res);
    }
  );
  // const DBConn = getDataBaseConnection("getThumbnailStream");
  // DBConn().conn.client.connect(function (error, client) {
  //   if (error) {
  //     res.status(500).json(error);
  //     return;
  //   }

  //   const db = client.db("CatFlix");
  //   // GridFS Collection

  //   const bucket = new mongodb.GridFSBucket(db, {
  //     chunkSizeBytes: 1024,
  //     bucketName: "Thumbnails",
  //   });

  //   const downloadStream = bucket.openDownloadStream(
  //     mongoose.Types.ObjectId(uId)
  //   );

  //   downloadStream.pipe(res);
  // });
};
exports.getVideosByCreator = async (req, res, next) => {
  const userId = req.userData.userId;
  console.log(userId);
  const DBConn = getDataBaseConnection("getVideosByCreator");
  let video_list = [];
  await DBConn().conn.client.connect(async function (error, client) {
    if (error) {
      res.status(500).json(error);
      return;
    }
    const db = client.db("CatFlix");
    video_list = await db
      .collection("VideoCollection")
      .find({
        creator: mongoose.Types.ObjectId(userId),
      })
      .toArray();
    res.json(video_list);
  });
};

exports.getCategories = async (req, res, next) => {
  categorySchema.find({}, (error, category) => {
    if (error) {
      res.json({ message: "No category found" });
      return;
    }
    res.json(category);
  });
};

exports.getVideoStream = (req, res, next) => {
  const DBConn = getDataBaseConnection("getVideoStream");
  DBConn().gfs.collection("VideoFiles");
  DBConn().gfs.files.findOne(
    { _id: mongoose.Types.ObjectId(req.params.id) },
    (err, video) => {
      if (err) {
        return res.status(400).send({
          err: errorHandler.getErrorMessage(err),
        });
      }
      if (!video) {
        console.log(video, "Couldn't stream video not found");
        return res.status(404).send({
          err: "Not Found",
        });
      }
      const videoSize = video.length;
      const range = req.headers.range;
      if (range) {
        
        const CHUNK_SIZE = 10 ** 6;
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

        const contentLength = end - start + 1;
        const bucket = new mongodb.GridFSBucket(mongoose.connection.db, {
          bucketName: "VideoFiles",
        });
        console.log(
          streamCounter,
          " start ",
          start,
          " end ",
          end,
          "content-length",
          contentLength,
          "video size",
          videoSize
        );
        const downloadStream = bucket.openDownloadStreamByName(video.filename, {
          start: start,
          end: end + 1,
        });

        // Finally pipe video to response
        streamCounter++;
        const head = {
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": contentLength,
          "Content-Type": "video/mp4",
        };

        res.writeHead(206, head);
        downloadStream.on("data", (chunk) => {
          res.write(chunk);
        });

        downloadStream.on("error", (err) => {
          res.sendStatus(404);
        });

        downloadStream.on("end", () => {
          res.end();
        });
      } else {
        const bucket = new mongodb.GridFSBucket(mongoose.connection.db, {
          bucketName: "VideoFiles",
        });
        const downloadStream = bucket.openDownloadStream(video._id);
        const head = {
          "Content-Length": videoSize,
          "Content-Type": "video/mp4",
        };
        res.writeHead(200, head);
        downloadStream.pipe(res);
      }
    }
  );
};
exports.getVideoTrailer = (req, res, next) => {};
exports.deleteVideo = (req, res, next) => {
  const DBConn = getDataBaseConnection("deleteVideo");
  const userId = req.userData.userId;
  let videoId = req.params.id;
  let video, video_chunk, video_file;
  //const userID = req.userData.userId;

  DBConn().conn.client.connect(async function (error, client) {
    const db = client.db("CatFlix");
    if (error) {
      res.status(500).json(error);
      return;
    }
    try {
      video = await videoSchema
        .findOne({
          VideoFileID: mongoose.Types.ObjectId(videoId),
        })
        .exec();
      console.log(video);
      if (video.creator.toString() !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      console.log(video);
      video_file = await db
        .collection("VideoFiles.files")
        .deleteMany({ _id: mongoose.Types.ObjectId(videoId) });
      video_chunk = await db
        .collection("VideoFiles.chunks")
        .deleteMany({ files_id: mongoose.Types.ObjectId(videoId) });
      Thumbnails_file = await db
        .collection("Thumbnails.files")
        .deleteMany({ _id: mongoose.Types.ObjectId(video.ThumbnailFileID) });
      Thumbnails_chunk = await db.collection("Thumbnails.chunks").deleteMany({
        files_id: mongoose.Types.ObjectId(video.ThumbnailFileID),
      });
      video.delete();
      res.status(200).json({
        message: { video_file: video_file, video_chunk: video_chunk },
      });
    } catch (err) {
      const error = new HttpError(
        "Something went wrong, could not delete place.",
        500
      );
      return next(error);
    }
  });
};

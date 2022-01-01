const mongoose = require("mongoose");
const mongodb = require("mongodb");
const {
  getDataBaseConnection,
  mongooseConnectGFS,
} = require("../util/database.js");
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
        if (video.length>0) {
          videosByCategory.push({[category.category]:video});
        }
      })
    );
    res.json(videosByCategory);
  } catch {
    res.status(404).json({ message: "Could not find" });
  }
  // const DBConn = getDataBaseConnection("getVideos");
  // DBConn().gfs.collection("VideoFiles");
  // let video_list = await DBConn().gfs.files.find({}).toArray();
  // res.json(video_list);
};
// exports.getVideosByCategory = async (req, res, next) => {
//   try {
//     let category_list = await categorySchema.find({});
//     let videosByCategory = [];
//     await Promise.all(
//       category_list.map(async (category) => {
//         let video = await videoSchema.find({ category: category._id });
//         if (video.length>0) {
//           videosByCategory.push({[category.category]:video});
//         }
//       })
//     );
//     res.json(videosByCategory);
//   } catch {
//     res.status(404).json({ message: "Could not find" });
//   }
// };
exports.getThumbnailStream = async (req, res, next) => {
  let uId = req.params.id;
  const DBConn = getDataBaseConnection("getVideoStream");
  DBConn().conn.client.connect(function (error, client) {
    if (error) {
      res.status(500).json(error);
      return;
    }

    const db = client.db("CatFlix");
    // GridFS Collection

    const bucket = new mongodb.GridFSBucket(db, {
      chunkSizeBytes: 1024,
      bucketName: "Thumbnails",
    });

    const downloadStream = bucket.openDownloadStream(
      mongoose.Types.ObjectId(uId)
    );

    downloadStream.pipe(res);
  });
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
  DBConn().conn.client.connect(function (error, client) {
    if (error) {
      res.status(500).json(error);
      return;
    }

    // Check for range headers to find our start time
    const range = req.headers.range;
    if (!range) {
      res.status(400).send("Requires Range header");
    }

    const db = client.db("CatFlix");
    // GridFS Collection

    db.collection("VideoFiles.files").findOne(
      { _id: mongoose.Types.ObjectId(req.params.id) },
      (err, video) => {
        if (!video) {
          res.status(404).send("Video is not found");
          return;
        }
        console.log(video);
        // Create response headers
        const videoSize = video.length;
        const start = Number(range.replace(/\D/g, ""));
        const end = videoSize - 1;
        let contentLength = end - start + 1;

        const headers = {
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": contentLength,
          "Content-Type": "video/mp4",
        };

        // HTTP Status 206 for Partial Content
        res.writeHead(206, headers);

        // Get the bucket and download stream from GridFS
        const bucket = new mongodb.GridFSBucket(db, {
          bucketName: "VideoFiles",
        });

        const downloadStream = bucket.openDownloadStream(video._id, {
          start: start,
          end: end,
        });

        // Finally pipe video to response
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
        streamCounter++;

        downloadStream.pipe(res);
      }
    );
  });
};

exports.deleteVideo = (req, res, next) => {
  const DBConn = getDataBaseConnection("deleteVideo");

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
        .find({
          VideoFileID: mongoose.Types.ObjectId(videoId),
        })
        .exec();
      console.log(video);
      video_file = await db
        .collection("VideoFiles.files")
        .count({ _id: mongoose.Types.ObjectId(videoId) });
      console.log("deleting chunks");
      video_chunk = await db
        .collection("VideoFiles.chunks")
        .count({ files_id: mongoose.Types.ObjectId(videoId) });
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

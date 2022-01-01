const express = require("express");
const bodyParser = require("body-parser");
const videoApi = require("./routes/videos");
const app = express();
const usersRoutes = require('./routes/users-routes');
//const methodOverride = require("method-override");
const cors = require("cors");
//const fileUploadHandler = require("./util/FileUploadHandler");
const {connectionHanlder} = require("./util/database");
//const videoSchema = require("./models/videoSchema");
//const categorySchema = require("./models/categorySchema");



app.use(bodyParser.json());
app.use(cors());
app.use('/api/users', usersRoutes);

app.use("/cat-videos", videoApi);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

connectionHanlder(()=>{
  app.listen(8000);
  console.log('database is connected successfully');
})
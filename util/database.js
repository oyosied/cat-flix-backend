const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const conn = mongoose.connection;
const mongoURI =
  "";
const options = {
  autoIndex: false, // Don't build indexes
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
};
let DataBaseConnection;

const connectionHanlder = (callback) => {
  mongoose
    .connect(mongoURI, options)
    .then((result) => {
      DataBaseConnection = {
        mongoose,
        conn:mongoose.connection,
        gfs: Grid(conn.db, mongoose.mongo),
      };
      //console.log(DataBaseConnection.conn.getClient())
      callback();
    })
    .catch((err) => {
      console.log(err);
    });

};
const getDataBaseConnection = (place) => {
  return () => {
    console.log(place,"called");
    return DataBaseConnection;
  };
};
exports.mongooseConnect = () => {
  // use for on demand connection
  // returns conn
  const conn = mongoose.createConnection(mongoURI);
  return conn; 

};
exports.mongooseConnectGFS = (bucketName) => {
  const gfs = Grid(conn.db, mongoose.mongo);
  return gfs;
};
exports.getDataBaseConnection = getDataBaseConnection;
exports.connectionHanlder = connectionHanlder;
exports.mongoURI = mongoURI;

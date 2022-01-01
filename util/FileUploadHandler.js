const multer =require('multer');
const crypto = require('crypto');
const {GridFsStorage} = require('multer-gridfs-storage');
const path = require('path');
const {mongoURI} = require("./database");

//const conn = mongoose.connection;
//const gfs=require();
// conn.once('open',()=>{
//     // Init stream
//     gfs = Grid(conn.db,mongoose.mongo);
//     gfs.collection('videos');
// });

//Create storage engine
const storage = new GridFsStorage({
    url:mongoURI,
    file:(req,file)=>{
        return new Promise((resolve,reject)=>{
            console.log("I am here");
            crypto.randomBytes(16,(err,buf)=>{
                if(err){
                    return reject(err);
                }
                const filename=buf.toString('hex') + path.extname(file.originalname);
                let bucketName;
                if (file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
                    bucketName="Thumbnails";
                }
                if(file.mimetype == 'video/mp4')
                {
                   bucketName="VideoFiles"
                }
                const fileInfo={
                    filename:filename,
                    bucketName:bucketName
                };
                console.log(file);
                resolve(fileInfo);
            })
        })
    }
});

const upload = multer({storage});

module.exports=upload;
const express = require("express");
const app = express();
const fs = require("fs");
const mongodb = require("mongodb");
const url = "mongodb://127.0.0.1:27017/";

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.get('/init-video', function (req, res) {
    mongodb.MongoClient.connect(url,{ useUnifiedTopology: true }, function (error, client) {
        if (error) {
            res.json(error);
            return;
        }
        const db = client.db('videos');
        db.collection("fs.files").countDocuments().then((count)=>{
            const bucket = new mongodb.GridFSBucket(db);
            const videoUploadStream = bucket.openUploadStream('video7',{id:`:${count+1}`});
            const videoReadStream = fs.createReadStream('./video7.mp4');
            videoReadStream.pipe(videoUploadStream);
            res.status(200).send("Done...");
        });
        
    });
});

app.get('/data', function(req,res) {
    mongodb.MongoClient.connect(url,{ useUnifiedTopology: true }, function (error, client) {
        if (error) {
            res.json(error);
            return;
        }
        const db = client.db('videos');
        db.collection("fs.files").countDocuments().then((count)=>{
            res.send({count:count});
        });
        
    });
})

app.get('/videos/:id', function (req, res) {
    mongodb.MongoClient.connect(url, { useUnifiedTopology: true },function (error, client) {
        if (error) {
            res.status(500).json(error);
            return;
        }
        const range = req.headers.range;
        if (!range) {
            res.status(400).send("Requires Range header");
        }

        const db = client.db('videos');
        // GridFS Collection
        db.collection('fs.files').findOne({_id:req.params.id}, (err, video) => {
            if (!video) {
                res.status(404).send("No video uploaded!");
                return;
            }

            // Create response headers
            const videoSize = video.length;
            const start = Number(range.replace(/\D/g, ""));
            const end = videoSize - 1;

            const contentLength = end - start + 1;
            const headers = {
                "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": contentLength,
                "Content-Type": "video/mp4",
            };

            const {length} = video;

            // HTTP Status 206 for Partial Content
            res.writeHead(206, headers);
            const bucket = new mongodb.GridFSBucket(db);
            const downloadStream = bucket.openDownloadStreamByName(video.filename, {
                start:start,
                end: length
            });

            // Finally pipe video to response
            downloadStream.pipe(res);
        });
    });
});




app.listen(8000, function () {
    console.log("listening on port 8000");
});
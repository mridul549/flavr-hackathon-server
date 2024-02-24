const mongoose = require('mongoose');
const Outlet                = require('../../models/outlet/outlet');
const Seq                   = require('../../models/outlet/seq')
const qrcode                = require('qrcode');
const cloudinary            = require('cloudinary').v2;
const Owner                 = require('../../models/owner/owner');

module.exports.addOutlet = (req,res) => {
    const ownerID = req.userData.ownerid

    Outlet.find({
        // using the $and operator to search the DB with multiple conditions
        $and: [
            { outletName: req.body.outletName },
            { address: req.body.address },
            { owner: req.userData.ownerid }
        ]
    })
    .then(result => {
        if(result.length>0) {
            return res.status(404).json({
                message: "Outlet already exists"
            })
        } 
        
        let outletPromise;
        let timings  = req.body.timings
        let daysOpen = req.body.daysOpen

        if(timings==undefined){
            timings={}
        } else {
            timings=JSON.parse(timings)
        }

        if(daysOpen==undefined){
            daysOpen={}
        } else {
            daysOpen=JSON.parse(daysOpen)
        }

        if (req.files && req.files.outletImage) {
            const file = req.files.outletImage;

            outletPromise = new Promise((resolve, reject) => {
                cloudinary.uploader.upload(file.tempFilePath, (err, image) => {
                    if (err) {
                        return reject(err);
                    }

                    const outlet = new Outlet({
                        _id: new mongoose.Types.ObjectId(),
                        outletName: req.body.outletName,
                        address: JSON.parse(req.body.address),
                        owner: req.userData.ownerid,
                        activeOrders: [],
                        completedOrders: [],
                        timings: timings,
                        daysOpen: daysOpen.daysOpen,
                        outletImage: {
                            url: image.url,
                            imageid: image.public_id,
                        },
                    });
                    resolve(outlet.save());
                });
            });
        } else {
            const outlet = new Outlet({
                _id: new mongoose.Types.ObjectId(),
                outletName: req.body.outletName,
                address: JSON.parse(req.body.address),
                owner: req.userData.ownerid,
                activeOrders: [],
                completedOrders: [],
                timings: timings,
                daysOpen: daysOpen.daysOpen,
                outletImage: {
                    url: "null",
                    imageid: "null",
                },
            });

            outletPromise = outlet.save();
        }

        return outletPromise;
    })
    .then(result => {
        // generates a qr code data url
        const qrCodePromise = new Promise((resolve, reject) => {
            qrcode.toDataURL(`${result._id}`, {
                errorCorrectionLevel: 'H',
                color: {
                    dark: '#000',  // black dots
                    light: '#fff' // white background
                }
            }, (err, qrdata) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(qrdata);
                }
            });
        });
        // passing the outlet created and the data url to next promise
        return Promise.all([result, qrCodePromise]);
    })
    .then(([result, qrdata]) => {
        // uploading the genrated qr code to cloud
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(qrdata, (err, image) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ result, image });
                }
            });
        });
    })
    .then(async ({ result, image }) => {
        // updating the created outled with the cloud link just created
        try {
            await Outlet.updateOne({ _id: result._id }, {
                $set: {
                    "outletqr": {
                        url: image.url,
                        qrid: image.public_id
                    }
                }
            })
            .exec();
            return result;
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                error: err
            });
        }
    })
    .then(async result => {
        // createQRAndUpload(result, req, res)
        try {
            await Owner.updateOne({ _id: ownerID }, {
                $push: {
                    outlets: result._id
                }
            })
            .exec();
            return result;
        } catch (err) {
            return res.status(500).json({
                error: err
            });
        }
    })
    .then(async result => {
        const outletid = result._id

        try {
            const seq = new Seq({
                _id: new mongoose.Types.ObjectId(),
                counter: 0,
                outlet: outletid
            })
            await seq.save()

            return res.status(201).json({
                message: "Outlet added successfully",
                createdOutlet: result
            })
        } catch (error) {
            return res.status(500).json({
                error: err
            });
        }
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}
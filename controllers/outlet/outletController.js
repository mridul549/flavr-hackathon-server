const mongoose = require('mongoose');
const Outlet                = require('../../models/outlet/outlet');
const Seq                   = require('../../models/outlet/seq')
const qrcode                = require('qrcode');
const cloudinary            = require('cloudinary').v2;
const Owner                 = require('../../models/owner/owner');

module.exports.getAllOutletsByCity = (req,res) => {
    const city = req.query.city
    Outlet.find({ "address.city": city })
    .exec()
    .then(result => {
        return res.status(200).json({
            outlets: result
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.getAllOutlets = (req,res) => {
    Outlet.find({})
    .exec()
    .then(result => {
        return res.status(200).json({
            outlets: result
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.getOutlet = (req,res) => {
    const outletid = req.query.outletid

    Outlet.find({ _id: outletid })
    .exec()
    .then(result => {
        return res.status(200).json({
            result
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

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

module.exports.updateOutlet = (req,res) => {
    const outletid = req.params.outletid
    const ownerid = req.userData.ownerid

    Outlet.find({ _id: outletid })
    .exec()
    .then(async result => {
        if(result.length>0) {
            if(result[0].owner==ownerid){
                const outletName = req.body.outletName
                const address = JSON.parse(req.body.address)
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

                if(req.files && req.files.outletImage) {
                    const file = req.files.outletImage
                    const outlet = await Outlet.find({ _id: outletid })

                    if(!outlet) {
                        return res.status(404).json({
                            error: "No outlet found"
                        })
                    }

                    const imageUrl = outlet[0].outletImage.url
                    const imageId = outlet[0].outletImage.imageid

                    if(imageUrl!=="null") {

                        cloudinary.uploader.destroy(imageId, (err,result) => {
                            if(err) {
                                return res.status(500).json({
                                    error: "error in deleting the old image"
                                })
                            }
                        })
    
                    } 
                    cloudinary.uploader.upload(file.tempFilePath, (err, image) => {
                        if(err) {
                            return res.status(201).json({
                                error: "image upload failed"
                            })
                        }
                        const imageProp = {
                            url: image.url,
                            imageid: image.public_id
                        }
    
                        Outlet.updateOne({ _id: outletid }, {
                            $set: {
                                outletName: outletName,
                                address: address,
                                timings: timings,
                                daysOpen: daysOpen.daysOpen,
                                outletImage: imageProp
                            }
                        })
                        .exec()
                        .then(result => {
                            return res.status(200).json({
                                message: "Outlet updated successfully"
                            })
                        })
                        .catch(err => {
                            console.log(err);
                            return res.status(500).json({
                                error: "Error in updating outlet"
                            })
                        })
                    })
                } else {
                    Outlet.updateOne({ _id: outletid }, {
                        $set: {
                            outletName: outletName,
                            address: address,
                            timings: timings,
                            daysOpen: daysOpen.daysOpen,
                        }
                    })
                    .exec()
                    .then(result => {
                        return res.status(200).json({
                            message: "Outlet updated successfully"
                        })
                    })
                    .catch(err => {
                        console.log(err);
                        return res.status(500).json({
                            error: "Error in updating outlet"
                        })
                    })
                }
                
            } else {
                return res.status(401).json({
                    error: "Unauthorised access"
                })
            }
        } else {
            return res.status(404).json({
                error: "Outlet not found"
            })
        }
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

// 0. Find an outlet
// 1. If outlet image present, remove it from cloud
// 2. Delete qr from cloud
// 3. remove outlet from DB
// 4. remove outlet from owner's outlet array
// 5. romove all products from products array in owner schema of an outlet
// 6. romove all products of this outlet
// 7. Delete the outlet sequence too
module.exports.deleteOutlet = (req,res) => {
    const outletid = req.body.outletid
    const ownerid = req.userData.ownerid

    Outlet.find({ _id: outletid })
    .exec()
    .then(result => {
        if(result.length>0) {
            const imageidOld = result[0].outletImage.imageid
            const qrid       = result[0].outletqr.qrid

            if(imageidOld!=="null") {
                // deleting outlet image from cloud if exits
                cloudinary.uploader.destroy(imageidOld, (err,result) => {
                    if(err) {
                        return res.status(500).json({
                            error: "error in deleting the old image"
                        })
                    }
                })
            }

            // deleteing qr from cloud
            cloudinary.uploader.destroy(qrid, (err,result) => {
                if(err) {
                    return res.status(500).json({
                        error: "error in deleting the old image"
                    })
                }
            })
            
            Outlet.deleteOne({ _id: outletid })
            .exec()
            .then(async result => {
                await Owner.updateOne({ _id: ownerid }, {
                    $pull: { outlets: outletid }
                })
                .exec();
                return result;
            })
            .then(async result => {
                await Owner.updateMany({ _id: ownerid }, {
                    $pull: { products: { outlet: outletid }}
                })
                .exec();
                return result
            })
            .then(async result => {
                await Product.deleteMany({ outlet: outletid })
                .exec();
                return result;
            })
            .then(async result => {
                await Seq.deleteOne({ outlet: outletid })
                .exec()
                return result
            })
            .then(result => {
                return res.status(200).json({
                    message: "Outlet deleted successfully"
                })
            })
            .catch(err => {
                console.log(err);
                res.status(500).json({
                    error: err
                })
            })
        } else {
            return res.status(404).json({
                error: "Cant find an outlet"
            })
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        })
    })
}

module.exports.getMenuSize = (req,res) => {
    const outletid = req.query.outletid
    Outlet.find({ _id: outletid })
    .exec()
    .then(result => {
        if(result.length>0) {
            return res.status(200).json({
                menuSize: result[0].menu.length
            })
        } else {
            return res.status(404).json({
                error: "Outlet doesn't exist"
            })
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        })
    })
}

module.exports.updateImage = (req,res) => {
    const outletid = req.params.outletid

    Outlet.find({ _id: outletid })
    .exec()
    .then(result => {
        if(result.length>0) {
            const imageidOld = result[0].outletImage.imageid

            if(imageidOld!==undefined && imageidOld !== "null") {
                cloudinary.uploader.destroy(imageidOld, (err,result) => {
                    if(err) {
                        return res.status(500).json({
                            error: "error in deleting the old image"
                        })
                    }
                })
            }
            
            if(req.files && req.files.newOutletImage) {
                const file = req.files.newOutletImage
                cloudinary.uploader.upload(file.tempFilePath, (err, image) => {
                    if(err) {
                        return res.status(500).json({
                            error: "image upload failed"
                        })
                    }
                    Outlet.updateOne({ _id: outletid }, {
                        $set: { outletImage: {
                            url: image.url,
                            imageid: image.public_id
                        }}
                    })
                    .exec()
                    .then(docs => {
                        return res.status(200).json({
                            message: "Image updated successfully"
                        })
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        })
                    })
                })
            } else {
                return res.status(400).json({
                    error: "No file found to upload"
                })
            }
        } else {
            return res.status(404).json({
                error: "Outlet not found"
            })
        }
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.deleteOutletImage = async (req,res) => {
    const outletid = req.body.outletid
    const ownerid  = req.userData.ownerid

    Outlet.find({ _id: outletid })
    .exec()
    .then(async result => {
        if(result.length>0) {
            const imageid = result[0].outletImage.imageid

            if(result[0].owner.toString()!==ownerid){
                return res.status(401).json({
                    error: "Unauthorised access"
                })
            }

            if(imageid!="null"){
                cloudinary.uploader.destroy(imageid, (err,result) => {
                    if(err) {
                        return res.status(500).json({
                            error: "error in deleting the old image"
                        })
                    }
                })

                try {
                    await Outlet.updateOne({ _id: outletid }, {
                        $set: {
                            "outletImage.url": "null",
                            "outletImage.imageid": "null"
                        }
                    })
                    .exec()
                } catch (error) {
                    console.log(err);
                    return res.status(500).json({
                        error: err
                    })
                }
                
                return res.status(200).json({
                    message: "Image deleted successfully"
                })
            } else {
                return res.status(400).json({
                    error: "No image exists for the outlet"
                })
            }

        } else {
            return res.status(404).json({
                error: "No outlet found"
            })
        }
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

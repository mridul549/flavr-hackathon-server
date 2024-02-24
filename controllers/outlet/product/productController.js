const mongoose              = require('mongoose');
const Product               = require('../../../models/outlet/product/product');
const Owner                 = require('../../../models/owner/owner');
const Outlet                = require('../../../models/outlet/outlet');
const Category              = require('../../../models/outlet/product/category/category')
const cloudinary            = require('cloudinary').v2;

function saveProduct (product, categoryid, req, res) {
    product.save()
    .then(async result => {
        await Category.updateOne({ _id: categoryid }, {
            $push: {
                products: result._id 
            }
        })
        .exec()
        return result
    })
    .then(async result => {
        await Owner.updateOne({ _id: req.userData.ownerid }, {
            $push: {
                products: {
                    product: result._id,
                    outlet: req.body.outletid
                }
            }
        })
            .exec();
        return result;
    })
    .then(async result => {
        await Outlet.updateOne({ _id: req.body.outletid }, {
            $push: {
                menu: result._id
            }
        })
            .exec();
        return result;
    })
    .then(result => {
        return res.status(201).json({
            message: "Product added successfully",
            createdProduct: result
        })
    })
    .catch(error => {
        console.log(error);
        return res.status(500).json({
            error: "Failed to save product"
        });
    });
}

module.exports.addProduct = (req,res) => {
    Product.find({
        $and: [
            { category: req.body.categoryid },
            { productName: req.body.productName },
            { description: req.body.description },
            { price: req.body.price },
            { outlet: req.body.outletid },
            { owner: req.userData.ownerid }
        ]
    })
    .exec()
    .then(async result => {
        if(result.length>0){
            return res.status(404).json({
                message: "Product already exists"
            })
        }
        
        try {
            const outlet = await Outlet.find({ _id: req.body.outletid })
            if(!outlet){
                return res.status(404).json({
                    error: "Outlet Not found"
                })
            }

            if(outlet[0].owner.toString()!==req.userData.ownerid){
                return res.status(401).json({
                    error: "Owner doesn't belong to this outlet"
                })
            }

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                error: "Error in finding outlet"
            })
        }

        let variants = req.body.variants
        // if variants array is not recieved, intialise it to empty array
        if(variants===undefined) {
            variants=[]
        } else {
            variants = JSON.parse(variants)
        }
        
        var imageProp = {
            url: "null",
            imageid: "null"
        }

        const productwofile = new Product({
            _id: new mongoose.Types.ObjectId(),
            category: req.body.categoryid,
            productName: req.body.productName,
            description: req.body.description,
            price: req.body.price,
            veg: req.body.veg,
            owner: req.userData.ownerid,
            outlet: req.body.outletid,
            variants: variants,
            productImage: imageProp
        })

        if(req.files && req.files.productImage) {
            const file = req.files.productImage
            cloudinary.uploader.upload(file.tempFilePath, (err, image) => {
                if(err) {
                    return res.status(201).json({
                        error: "image upload failed"
                    })
                }
    
                imageProp = {
                    url: image.url,
                    imageid: image.public_id
                }

                const productwfile = new Product({
                    _id: new mongoose.Types.ObjectId(),
                    category: req.body.categoryid,
                    productName: req.body.productName,
                    description: req.body.description,
                    price: req.body.price,
                    veg: req.body.veg,
                    owner: req.userData.ownerid,
                    outlet: req.body.outletid,
                    variants: variants,
                    productImage: imageProp
                })
                saveProduct(productwfile, req.body.categoryid, req, res)
            })
        } else {
            saveProduct(productwofile, req.body.categoryid, req, res)
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        })
    })
}
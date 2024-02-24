const mongoose = require('mongoose')
const Category = require('../../../../models/outlet/product/category/category')
const Owner = require('../../../../models/owner/owner')
const Outlet = require('../../../../models/outlet/outlet')

module.exports.addCategory = async (req,res) => {
    const ownerId = req.userData.ownerid
    let categoryName = req.body.categoryName 
    const outletid = req.body.outletid
    const categoryIconId = req.body.categoryIconId
    categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)

    try {
        const owner = await Owner.find({ _id: ownerId })

        if(owner.length===0) {
            return res.status(404).json({
                message: "Owner not found"
            })
        }

        const outlet = await Outlet.find({ _id: outletid })
        if(outlet.length===0) {
            return res.status(404).json({
                message: "Outlet not found"
            })
        }

        if(outlet[0].owner.toString()!==ownerId) {
            return res.status(401).json({
                message: "Unauthorized access"
            })
        }

        const category = await Category.find({
            $and: [
                { name: categoryName },
                { icon: categoryIconId },
                { outlet: outletid }
            ]
        })

        if(category.length>0) {
            return res.status(409).json({
                message: "Category already exists"
            })
        } else {
            const category = new Category({
                _id: new mongoose.Types.ObjectId(),
                name: categoryName,
                icon: categoryIconId,
                outlet: outletid
            })

            await category.save()
            return res.status(201).json({
                message: "Category created",
                categoryId: category._id
            })
        }
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.updateCategory = (req,res) => {
    const ownerId = req.userData.userId
    const categoryid = req.query.categoryid
    const outletid = req.query.outletid
    const categoryName = req.body.name
    const iconid = req.body.iconid

    Category.find({
        $and: [
            { _id: categoryid },
            { outlet: outletid }
        ]
    })
    .exec()
    .then(async result => {
        if(result.length>0) {
            const owner = await Owner.findById(ownerId)
            if(!owner) {
                return res.status(404).json({
                    message: "Owner not found"
                })
            }

            const outlet = await Outlet.findById(outletid)
            if(!outlet) {
                return res.status(404).json({
                    message: "Outlet not found"
                })
            }

            if(outlet.owner.toString()!==ownerId) {
                return res.status(401).json({
                    message: "Unauthorized access"
                })
            }

            Category.updateOne({ _id: categoryid }, {
                $set: {
                    name: categoryName,
                    icon: iconid
                }
            })
            .exec()
            .then(result => {
                return res.status(200).json({
                    message: "Category updated successfully",
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
                message: "Category not found"
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

module.exports.getCategory = (req,res) => {
    const categoryid = req.query.categoryid

    Category.find({ _id: categoryid })
    .populate('icon')
    .populate('products')
    .exec()
    .then(result => {
        if(result.length>0){
            return res.status(200).json({
                category: result[0]
            })
        } else {
            return res.status(404).json({
                message: "category not found"
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
const mongoose     = require('mongoose')
const cloudinary   = require('cloudinary').v2;
const CategoryIcon = require('../../../../models/outlet/product/category/icon')

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

module.exports.addIcon = (req,res) => {
    if(req.files && req.files.categoryIcon) {
        const files = req.files.categoryIcon

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            cloudinary.uploader.upload(file.tempFilePath, async (err, image) => {
                if(err) {
                    return res.status(201).json({
                        error: "image upload failed"
                    })
                }
    
                iconProp = {
                    url: image.url,
                    iconid: image.public_id
                }
    
                const categoryIcon = new CategoryIcon({
                    _id: new mongoose.Types.ObjectId(),
                    icon: iconProp
                })
    
                await categoryIcon.save()
                
            })
        }

        return res.status(200).json({
            message: "Icon uploaded successfully"
        })
    }
}

module.exports.getAllIcons = (req,res) => {
    CategoryIcon.find({})
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
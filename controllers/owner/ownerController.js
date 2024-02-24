const mongoose   = require('mongoose');
const Owner      = require('../../models/owner/owner');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const mailController = require('../../mail/mailController')

module.exports.signup = (req,res) => {
    Owner.find({email: req.body.email})
    .exec()
    .then(owner => {
        if(owner.length>=1) {
            const authMethod = owner[0].authMethod

            if(authMethod=="regular"){
                const verification = owner[0].verification
    
                if(!verification){
                    return res.status(409).json({
                        message: "Email already exits, log in and complete verfication"
                    })
                } 
                return res.status(409).json({
                    message: "Email already exits, try logging in."
                })
            } else {
                return res.status(409).json({
                    message: "This email is already registered with us, use a different login method."
                })
            }
        } else {
            bcrypt.hash(req.body.password, 10, (err, hash) => {
                if(err){
                    return res.status(500).json({
                        error: err
                    })
                } else {
                    const owner = new Owner({
                        _id: new mongoose.Types.ObjectId,
                        ownerName: req.body.ownerName,
                        email: req.body.email,
                        password: hash,
                        authMethod: "regular"
                    })
                    owner
                    .save()
                    .then(async result => {
                        /**
                         * the role determines whether it's a user, owner or maintainer
                         * user -> 0
                         * owner -> 1
                         */
                        const key = req.body.email
                        const role = 1
                        await mailController.sendMail(key,role)
                        return res.status(201).json({
                            action: "Owner created and OTP Sent",
                            message: "Please check your mailbox for the OTP verification code."
                        })
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        })
                    })
                }
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

module.exports.login = (req,res) => {
    Owner.find({email: req.body.email})
    .exec()
    .then(user => {
        if(user.length<1){
            return res.status(401).json({
                message: "Auth Failed- No Email found"
            })
        }
        const authMethod = user[0].authMethod
        if(authMethod=="google"){
            return res.status(409).json({
                message: "Password is not set for this account. Login using some other method."
            })
        }
        const verification = user[0].verification
        if(!verification) {
            return res.status(409).json({
                message: "Email is not verified, please complete verification"
            })
        }
        bcrypt.compare(req.body.password, user[0].password, (err, result) => {
            if(err) {
                return res.status(401).json({
                    error: err
                })
            } 
            if(result) {
                const token = jwt.sign({
                    email: user[0].email,
                    ownerid: user[0]._id,
                    ownername: user[0].ownerName
                }, process.env.TOKEN_SECRET, {
                    expiresIn: "30 days"
                })
                return res.status(200).json({
                    message: "Auth successful",
                    token: token
                })
            }
            return res.status(401).json({
                message: "Auth failed"
            })
        })
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        })
    })
}

function getTokenForGoogleAuth (user,req,res) {
    const token = jwt.sign({
        email: user.email,
        ownerid: user._id,
        ownername: user.userName,
    }, process.env.TOKEN_SECRET, {
        expiresIn: "30 days"
    })
    return res.status(200).json({
        message: "Auth successful",
        token: token
    })
}

module.exports.google_Login_Signup = (req,res) => {
    const email = req.body.email

    Owner.find({ email: email })
    .exec()
    .then(result => {
        // no owner found with same credentials- sign the owner up
        if(result.length==0){
            // TODO- Update or add the details in future which are recieved through google
            // update the profile pic too
            const owner = new Owner({
                _id: new mongoose.Types.ObjectId,
                ownerName: req.body.ownerName,
                email: req.body.email,
                ownerProfilePic: {
                    url: req.body.profileUrl
                },
                verification: true,
                authMethod: "google"
            })
            owner
            .save()
            .then(newOwner => {
                getTokenForGoogleAuth(newOwner,req,res)
            })
            .catch(err => {
                console.log(err);
                res.status(500).json({
                    error: err
                })
            })
        } else {
            // Log the Owner in
            const authMethod = result[0].authMethod
            if(authMethod==='regular'){
                return res.status(400).json({
                    message: "Please use normal login"
                })
            }
            else {
                getTokenForGoogleAuth(result[0],req,res)
            }
        }
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}

module.exports.verifyOwner = (req,res) => {
    const email = req.body.email

    Owner.updateOne({ email: email }, {
        $set: { verification: true }
    })
    .exec()
    .then(result => {
        return res.status(200).json({
            message: "Owner verified"
        })
    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    })
}
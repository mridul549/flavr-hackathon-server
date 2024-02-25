const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const SibApiV3Sdk = require('@getbrevo/brevo');
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Models
const Otp = require('../models/otp')
const User = require('../models/user/user')
const Owner = require('../models/owner/owner')

// Brevo
let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_KEY

let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); 

const otpTemplate = fs.readFileSync(path.join(__dirname, './templates/otp.ejs'), 'utf8')
const resetTemplate = fs.readFileSync(path.join(__dirname, './templates/password.ejs'), 'utf8')

async function generateOTP (key,role) {
    const { customAlphabet } = await import('nanoid');
    const alphabet = '0123456789';
    const nanoid = customAlphabet(alphabet, 4);
    const nano = nanoid()
    let date = new Date()
    date = date.setMinutes(date.getMinutes()+15)

    try {
        await Otp.findOneAndUpdate(
            { 
                $and: [
                    { createdBy: key },
                    { role: role }
                ]
            },
            {
                $set: {
                    code: nano,
                    createdBy: key,
                    expiry: date,
                    role: role
                }, 
            },
            { upsert: true, new: true }
        )
        return nano
    } catch (error) {
        console.log(error);
        throw error
    }
}

async function sendPasswordResetMailHelper (req, res, key, url) {
    const renderedHTML = ejs.render(resetTemplate, { resetLink: url })

    try {
        sendSmtpEmail.subject = `FlavR Password Reset Mail`;
        sendSmtpEmail.htmlContent = renderedHTML;
        sendSmtpEmail.sender = {"name":"FlavR","email":"bistroverse@gmail.com"};
        sendSmtpEmail.to = [{"email": key}];

        apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {}, 
        function(error) {
            console.error(error);
        });
        
    } catch (error) {
        console.log(error);
        throw error
    }
}

module.exports.sendPasswordResetMail = (req,res) => {
    const email = req.body.email

    Owner.find({ email: email })
    .exec()
    .then(async result => {
        if(result.length>0) {
            const id = result[0]._id

            const token = jwt.sign({
                email: email,
                ownerid: id,
            }, process.env.TOKEN_SECRET, {
                expiresIn: "15m"
            })

            // TODO: Change the URL to the frontend URL
            const url = `https://flavr.onrender.com/resetpassword?id=${id}&token=${token}`

            await sendPasswordResetMailHelper(req,res,email,url)

        } else {
            return res.status(404).json({
                message: "Email doesn't exist"
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

module.exports.sendMail = async (key,role) => {
    const otpnew = await generateOTP(key,role)

    const renderedHTML = ejs.render(otpTemplate, { otp: otpnew })

    try {
        sendSmtpEmail.subject = `${otpnew} is your FlavR OTP Verification code`;
        sendSmtpEmail.htmlContent = renderedHTML;
        sendSmtpEmail.sender = {"name":"FlavR","email":"bistroverse@gmail.com"};
        sendSmtpEmail.to = [{"email": key}];

        apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {}, 
        function(error) {
            console.error(error);
        });
        
    } catch (error) {
        console.log(error);
        throw error
    }

}

module.exports.reSendOTP = async (req,res) => {
    const key = req.body.key
    const role = req.body.role
    
    try {
        await this.sendMail(key,role)
        return res.status(201).json({
            action: "OTP Sent",
            message: "Please check your mailbox for the OTP."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: error
        })
    }
}

module.exports.verifyOTP = (req,res) => {
    const otp = req.body.otp
    const key = req.body.key
    const role = req.body.role

    Otp.find({ 
        $and: [
            { createdBy: key },
            { role: role }
        ]
    })
    .exec()
    .then(async result => {
        if(result.length>0){
            const otpStored = result[0].code
            const expiry    = result[0].expiry
            const date      = new Date()

            if(otp===otpStored) {
                if(date<=expiry) {
                    switch (role) {
                        case 0:
                            verifyUser(key,req,res)
                            break;
                        case 1:
                            verifyOwner(key,req,res)
                            break;
                        default:
                            break;
                    }
    
                    await Otp.deleteOne({ createdBy: key })
                    
                    return res.status(200).json({
                        message: "OTP Verified, you can log in now."
                    })
                } else {
                    return res.status(400).json({
                        message: "OTP has expired, please request for a new one."
                    })
                }
            } else {
                return res.status(400).json({
                    message: "Invalid OTP, please try again."
                })
            }
        } else {
            return res.status(404).json({
                error: "Wrong key provided"
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

const verifyUser = async (key,req,res) => {
    try {
        await User.updateOne({ email: key }, {
            $set: { verification: true }
        })

    } catch (error) {
        return res.status(500).json({
            error: "Error while updating user"
        })
    }
}

const verifyOwner = async (key,req,res) => {
    try {
        await Owner.updateOne({ email: key }, {
            $set: { verification: true }
        })

    } catch (error) {
        return res.status(500).json({
            error: "Error while updating Owner"
        })
    }
}
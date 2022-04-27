const express = require('express')
const axios = require('axios')
const jwt = require('jsonwebtoken')
const requestIp = require('request-ip')
const Product = require('../models/product')
const {Review} = require('../models/review')

require('dotenv').config()
let router = express.Router()

router.get('/', authenticate, async (req,res,next)=>{
    try{
        console.log("here");
        let reviews = await Review.find()
        res.json(reviews);
    }
    catch(e){
        res.status(400).json(e)
    }
})

router.post('/monitor',authenticate, async (req,res,next)=>{
    try{
        req.body.remove_reviews.forEach( async (review_id) => {
            await Review.findByIdAndUpdate(review_id,{review_type : 'fake'})
        });
        req.body.remove_ip.forEach(async (ip_address) => {
            await Review.findOneAndUpdate({ip_address : ip_address},{review_type : 'fake'})
        });
        res.sendStatus(200);
    }
    catch(e){
        res.status(400).json(e)
    }
})

router.post('/like',authenticate, async (req,res,next)=>{
    try{
        let review = await Review.findOne({_id : req.body.review_id})
        let result = await axios.get(`http://localhost:8001/${req.user.username}`,{
            headers : {
                "Authorization" : `Bearer ${req.token}`
            }
        })
        let user = result.data
        let ind = review.likedBy.indexOf(user.name)
        let helpful = user.helpful
        if(ind==-1){  
            helpful++;
            await Promise.all([Review.findOneAndUpdate({_id : req.body.review_id},{$push : {likedBy : user.name}, $inc : {helpful : 1}}),
                axios.post(`http://localhost:8001/${review.author}`,
                    {
                    helpful : helpful
                    },
                    {
                    headers : {
                        "Authorization" : `Bearer ${req.token}`
                    }
                })
            ])
        }
        else{
            helpful--;
            await Promise.all([Review.findOneAndUpdate({_id : req.body.review_id},{$pull : {likedBy : user.name}, $inc : {helpful : -1}}),
                axios.post(`http://localhost:8001/${review.author}`,
                    {
                    helpful : helpful
                    },
                    {
                    headers : {
                        "Authorization" : `Bearer ${req.token}`
                    }
                })
            ])
        }
        res.json({message : 'Successfully liked'})
    }
    catch(e){
        res.status(400).json({message : 'Could not like, please try again'})
    }
})

router.post('/:product_name',authenticate,async (req,res,next)=>{
    try{
        let product = await Product.findOne({product_name : req.params.product_name})
        if(product===null){
            return res.status(400).json({field : 'product_name', error : 'Product not found'})
        }
        let result = await axios.post("http://localhost:5000/rate",{
            review_heading : req.body.reviewHead,
            review_body : req.body.reviewBody
        })
        
        let review = new Review({reviewHead : req.body.reviewHead, reviewBody : req.body.reviewBody, author : req.body.author, product_name : req.body.product_name, product_id : product._id, product_parent : product.product_parent, rating : result.data.rating, ip_address : requestIp.getClientIp(req)})
        await review.save()
        result = await axios.get(`http://localhost:8001/${req.user.username}`,{
            headers : {
                "Authorization" : `Bearer ${req.token}`
            }
        })
        let user = result.data
        result = await axios.post(`http://localhost:8001/${req.body.author}`,{
            reviews : user.reviews+1
        },
        {
            headers : {
                "Authorization" : `Bearer ${req.token}`
            }
        })
        product = await Product.findByIdAndUpdate({_id : product._id},{$push : { reviews : review._id}}, {runValidators : true, new : true})
        res.json({message : 'Successfully posted a review'})
    }
    catch(e){
        console.log(e)
        res.status(400).json(e)
    }
})


function authenticate(req,res,next){
    const authheader = req.headers['authorization']
    const token = authheader && authheader.split(' ')[1]
    if(token===null)return res.status(401).json({message : "Forbidden"})
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,data)=>{
      if(err) return res.status(403).json({message : 'Unauthorized'});
      req.user = data
      req.token = token
      next()
    })
  }

module.exports = router
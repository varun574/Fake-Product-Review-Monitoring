var express = require('express');
require('dotenv').config()
const multer = require('multer')
const multerS3 = require('multer-s3')
const S3 = require('aws-sdk/clients/s3')
const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken')

const amqp = require('amqplib')
// var {getAMQPChannel} = require('../amqp_msgbroker/channel')
// let channel = getAMQPChannel()

const s3 = new S3({
  region : process.env.AWS_BUCKET_REGION,
  credentials : new AWS.Credentials({
    accessKeyId : process.env.AWS_ACCESS_KEY,
    secretAccessKey : process.env.AWS_SECRET_KEY
  })
})


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
// const storage = multerS3({
//   s3 : s3,
//   bucket : process.env.AWS_BUCKET_NAME,
//   key : function(req,file,cb){
//     cb(null,file.originalname)
//   }
// })

const upload = multer({storage : storage})
var fs = require('fs')
var router = express.Router();
const Product = require('../models/product')

/* GET home page. */

let channel;
async function connect(){
    try{
        let connection = await amqp.connect('amqp://localhost:5672')
        channel = await connection.createChannel()
        await Promise.all([channel.assertExchange('FbExchange','direct',{durable : true}),channel.assertQueue('ORDER_PREPARED'),channel.assertQueue('PREPARE_FAILED'),channel.assertQueue('order_paid_pqueue')])
        channel.bindQueue('order_paid_pqueue','FbExchange','ORDER_PAID')
    }
    catch(e){
        console.log(e);
        throw e;
    }
}

connect().then(()=>{

  channel.consume('order_paid_pqueue', async (data)=>{
    let order = JSON.parse(data.content.toString())
    try{
      let product = await Product.findById(order.product_id)
      console.log(order)
      if(product.stock >=1){
        await Product.findByIdAndUpdate(order.product_id, { $inc : { stock : -1 }})
        channel.sendToQueue('ORDER_PREPARED',Buffer.from(JSON.stringify(order)))
        channel.ack(data)
      }
      else{
        channel.sendToQueue('PREPARE_FAILED',Buffer.from(JSON.stringify(order)))
        channel.ack(data)
      }
    }
    catch(e){
      channel.sendToQueue('PREPARE_FAILED',Buffer.from(JSON.stringify(order)))
      channel.ack(data)
    }
  })
})

function isfileuploaded(req,res,next){
  if(!req.file){
    return res.status(400).json([
      {field : "image",error : "Image should be uploaded"}
    ])
  }
  next()
}



router.post('/search', async (req,res,next)=>{
  let products = await Product.find({}).select('product_name')
  let result = []
  let query = req.body.product_name.toLowerCase();
  products.forEach((product)=>{
    if(product.product_name.toLowerCase().startsWith(query)){
      result.push(product.product_name)
    }
  })
  console.log(result)
  res.json(result)
})

router.route('/')
  .get(async function(req, res, next) {
    try{
      let products = await Product.find({});
      res.json(products)
    }
    catch(e){
      res.status(400).send(e);
    }
  })
  .post(authenticate,upload.single('image'),async (req,res,next)=>{
    if(req.user.admin !== true)
    return res.sendStatus(403)
    let newProduct = {
      product_name : req.body.product_name,
      product_parent : req.body.product_parent,
      description : req.body.description,
      price : req.body.price,
      stock : req.body.stock,
      category : req.body.category,
      image : `https://fizzbuzz-products.s3.ap-south-1.amazonaws.com/${req.file.originalname}`
    }
    try{
      const product = new Product(newProduct);
      await product.save();
      await s3.upload({
        Bucket : process.env.AWS_BUCKET_NAME,
        Body : fs.createReadStream(req.file.path),
        Key : req.file.originalname
      }).promise()
      fs.unlinkSync(req.file.path)
      res.json(product);
    }
    catch(e){
      let errors =[]
      Object.keys(e.errors).map((key)=>{
        errors.push({
          field : key,
          error : e.errors[key].message
        })
      })
      res.status(400)
      res.json(errors);
    }
  })

router.route("/category/:category")
.get(async (req,res,next)=>{
  try{
    console.log(req.params.category)
    let result = await Product.find({category :req.params.category})
    console.log(result)
    res.json(result)
  }
  catch(e){
    res.status(400).json(e)
  }
})

router.route("/rate/:product_name")
.get(async (req,res,next)=>{
  try{
    let reviews = await Product.aggregate([
      {$match : {product_name : req.params.product_name}},
      {$project : {
        avg_rating : { $avg : "$ratings.rating"}
      }}
    ])
    if(reviews.length === 0){
      return res.status(400).json({rating : 0})
    }
    res.json(reviews[0])
  }
  catch(e){
    res.status(400).json(e)
  }
})
.post(authenticate,async (req,res,next)=>{
  try{
    let product = await Product.findOne({product_name : req.params.product_name, "ratings.name":req.body.name})
    if(product===null){
      await Product.findOneAndUpdate({product_name : req.params.product_name},{$push : { ratings : { rating : req.body.rating, name : req.body.name } }})
    }
    else{
      await Product.updateOne({product_name : req.params.product_name,"ratings.name": req.body.name},{$set : {"ratings.$.rating" : req.body.rating}})
    }
    res.redirect(`/rate/${req.params.product_name}`)
  }
  catch(e){
    return next(e)
  }
})


router.route("/:name")
  .get(async (req,res)=>{
    try{
      console.log("here")
      let product = await Product.findOne({product_name : req.params.name}).populate('reviews');
      if(product===null)
      res.status(404).json({field:"product_name",error:"Product doesn't exist"})
      else
      res.json(product);
    }
    catch(e){
      res.status(400).send(e)
    }
  })
  .post(authenticate,upload.single('image'),async (req,res,next)=>{
    try{
      let result;
      if(req.params.name===req.body.product_name){
        let product = {
          product_parent : req.body.product_parent,
          description : req.body.description,
          price : req.body.price,
          stock : req.body.stock,
          category : req.body.category,
          image : `https://fizzbuzz-products.s3.ap-south-1.amazonaws.com/${req.file.originalname}`
        }
        result = await Product.findOneAndUpdate({product_name : req.params.name},product,{runValidators:true,new:true});
      }
      else{
        result = await Product.findOne({product_name : req.params.name});
        result.product_name=req.body.product_name;
        result.price = req.body.price;
        result.product_parent = req.body.product_parent
        result.image = `https://fizzbuzz-products.s3.ap-south-1.amazonaws.com/${req.file.originalname}`
        result.description = req.body.description
        result.stock = req.body.stock
        result.category = req.body.category
        await result.save()
      }
    }
    catch(e){
      let errors =[]
      Object.keys(e.errors).map((key)=>{
        errors.push({
          field : key,
          error : e.errors[key].message
        })
      })
      res.status(400)
      res.json(errors);
    }
  })
  .delete(async (req,res)=>{
    try{
      let result = await Product.deleteOne({product_name : req.params.name})
      res.json(result)
    }
    catch(e){
      res.status(404).json(e)
    }
  })
router.post('/updateStock/:product_name',async (req,res)=>{
    try{
      if(isNaN(req.body.stock)){
        return res.status(400).json({message : "Stock must be a numerical value"})
      }
      let result = await Product.findOneAndUpdate({product_name : req.params.product_name},{$inc : { stock : Number(req.body.stock)}})
      res.json(result)
    }
    catch(e){
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
      next()
    })
  }
module.exports = router;

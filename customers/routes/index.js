var express = require('express');
var router = express.Router();
const User = require('../models/user')
const Token  = require('../models/token')
const jwt = require('jsonwebtoken')
require('dotenv').config()
// var {getAMQPChannel} = require('../amqp_msgbroker/channel')

// function makeid(length) {
//   var result           = '';
//   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//   var charactersLength = characters.length;
//   for ( var i = 0; i < length; i++ ) {
//     result += characters.charAt(Math.floor(Math.random() * 
// charactersLength));
//  }
//  return result;
// }

/* GET home page. */

const amqp = require('amqplib')

let channel;
async function connect(){
    try{
        let connection = await amqp.connect('amqp://localhost:5672')
        channel = await connection.createChannel()
        await Promise.all([channel.assertQueue('ORDER_CREATED'),channel.assertExchange('FbExchange','direct',{durable : true}),channel.assertQueue('PREPARE_FAILED')])
    }
    catch(e){
        console.log(e);
        throw e;
    }
}

connect().then(()=>{
  channel.consume('ORDER_CREATED',async (data)=>{
    let order = JSON.parse(data.content.toString())
    try{
      let user = await User.findById(order.customer_id)
      if(user.balance >= order.price){
        await User.findByIdAndUpdate(order.customer_id,{$inc : { balance : -order.price}})
        // channel.sendToQueue('ORDER_PAID',Buffer.from(JSON.stringify(order)))
        channel.publish('FbExchange','ORDER_PAID',Buffer.from(JSON.stringify(order)))
        channel.ack(data)
      }
      else{
        channel.sendToQueue('PAYMENT_FAILED',Buffer.from(JSON.stringify(order)))
        channel.ack(data)
      }
    }
    catch(e){
      channel.sendToQueue('PAYMENT_FAILED',Buffer.from(JSON.stringify(order)))
      channel.ack(data)
    }
  })
  
  channel.consume('PREPARE_FAILED', async (data)=>{
    let order = JSON.parse(data.content.toString())
    try{
      await User.findByIdAndUpdate(order.customer_id,{$inc : { balance : order.price}})
      channel.sendToQueue('PAYMENT_FAILED',Buffer.from(JSON.stringify(order)))
      channel.ack(data)
    }
    catch(e){
      channel.sendToQueue('PAYMENT_FAILED',Buffer.from(JSON.stringify(order)))
      channel.ack(data)
    }
  })
  
})


router.get('/',async function(req,res){
  let result = await User.find({})
  res.json(result)
})



router.post('/register',async function(req, res, next) {
  try{
    let details = {
      name : req.body.name,
      email : req.body.email,
      password : req.body.password,
    }
    const user = new User(details);
    await user.save()
    res.json(user)
  }
  catch(e){
    let errors =[]
    Object.keys(e.errors).map((key)=>{
      errors.push({
        field : key,
        error : e.errors[key].message
      })
    })
    console.log(errors);
    res.status(400)
    res.json(errors);
  }
});

router.post('/login',async (req,res)=>{
  let errors = []
  if(req.body.name === null || req.body.name === ""){
    errors.push({
      field : "name",
      error : "Username is required"
    })
  }
  if(req.body.password === null || req.body.password === ""){
    errors.push({
      field : "password",
      error : "Password is required"
    })
  }
  if(errors.length > 0){
    return res.status(400).json(errors);
  }
  let user = await User.findOne({name : req.body.name});
  if(user===null){
    return res.status(401).json([{
      field : "name",
      error : `Invalid username,Username doesn't exist` 
    }])
  }
  if(user.password !== req.body.password){
    return res.status(401).json([{
      field : "password",
      error : "Wrong password,Password doesn't match"
    }])
  }
  try{
    const accessToken = jwt.sign({username : req.body.name, admin : user.isadmin || false}, process.env.ACCESS_TOKEN_SECRET,{expiresIn : 15*60})
    res.json({token : accessToken});
  }
  catch(e){
    res.status(400).json(e)
  }
})

router.get('/profile',authenticate,async (req,res,next)=>{
  try{
    let user = await User.findOne({name : req.user.username})
    res.json({user : user})
  }
  catch(e){
    res.status(400).json({message : "Bad request"})
  }
})

router.get('/:name',authenticate,async (req,res)=>{
  try{
    console.log("here")
    if(req.user.username !== req.params.name){
      return res.status(403).json({message : "Unauthorized"})
    }
    let user = await User.findOne({name : req.user.username})
    res.json(user)
  }
  catch(e){
    res.status(404).json(e)
  }
})
router.post('/:name',authenticate, async (req,res,next)=>{
  try{
    if(req.user.username !== req.params.name){
      return res.status(403).json({message : "Unauthorized"})
    }
    let user = await User.findOne({name : req.params.name})                                                                                                                                                       
    let updateParams = {}
    Object.keys(req.body).forEach((key)=>{
      if(key === 'name'){
        if(req.body[key] !== user.name){
          updateParams.name = req.body[key]
        }
      }
      else if(key === 'email'){ 
        if(req.body[key] !== user.email){
          updateParams.email = req.body[key]
        }
      }
      else{
        updateParams[key] = req.body[key]
      }
    })
    let result = await User.findOneAndUpdate({name : req.params.name},updateParams,{runValidators : true, new : true})
    res.json({message : "Successfully Updated"})
  }
  catch(e){
    res.status(400).json(e)
  }
})

router.post('/updateBalance/:name',authenticate,async (req,res)=>{
  try{
    let user = await User.findOne({name : req.params.name})
    if(user.balance < Number(req.body.amount)){
      return res.status(400).json({message : "Insufficient balance to purchase the item"})
    }
    let balance  = user.balance + Number(req.body.amount)
    user = await User.findOneAndUpdate({name : req.params.name},{balance : balance},{new:true})
    res.json(user)
  }
  catch(e){
    console.log(e)
    res.status(404).json(e.response.data)
  }
})

function authenticate(req,res,next){
  const authheader = req.headers['authorization']
  const token = authheader && authheader.split(' ')[1]
  if(token===null)return res.status(401).json({message : "Forbidden"})
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,data)=>{
    if(err) return res.status(403).json({message : 'Unauthorized'});
    req.user = data
    console.log("here")
    next()
  })
}
module.exports = router;

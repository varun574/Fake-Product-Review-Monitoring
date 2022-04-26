var express = require('express');
var router = express.Router();
const Order = require('../models/order')
const axios = require('axios')
require('dotenv').config()
const jwt = require('jsonwebtoken')

const amqp = require('amqplib')
let channel;
async function connect(){
  try{
      let connection = await amqp.connect('amqp://localhost:5672')
      channel = await connection.createChannel()
      await Promise.all([channel.assertQueue('ORDER_CREATED'),channel.assertExchange('FbExchange','direct',{durable : true}), channel.assertQueue('ORDER_PREPARED'), channel.assertQueue('PAYMENT_FAILED'),channel.assertQueue('order_paid_oqueue')])
      channel.bindQueue('order_paid_oqueue','FbExchange','ORDER_PAID')
  }
  catch(e){
      console.log(e);
      throw e;
  }
}

connect().then(()=>{
  // channel.consume('ORDER_PAID', async (data)=>{
  //   let order = JSON.parse(data.content)
  //   try{
  //     let cur_order = await Order.findByIdAndUpdate(order.order_id,{status : "ORDER_PAID"})
  //     channel.ack(data)
  //   }
  //   catch(e){
  //     console.log(e)
  //   }
  // })
  channel.consume('order_paid_oqueue', async (data)=>{
    let order = JSON.parse(data.content.toString())
    try{
      let cur_order = await Order.findByIdAndUpdate(order.order_id,{status : "ORDER_PAID"})
      channel.ack(data)
    }
    catch(e){
      console.log(e)
    }
  })

  channel.consume('ORDER_PREPARED', async (data)=>{
    let order = JSON.parse(data.content.toString())
    try{
      let cur_order = await Order.findByIdAndUpdate(order.order_id,{status : "ORDER_SUCCESSFUL"})
      channel.ack(data)
    }
    catch(e){
      console.log(e)
    }
  })
  
  
  channel.consume('PAYMENT_FAILED', async (data)=>{
    let order = JSON.parse(data.content.toString())
    try{
      let cur_order = await Order.findByIdAndUpdate(order.order_id,{status : "ORDER_UNSUCCESSFUL"})
      channel.ack(data)
    }
    catch(e){
      console.log(e)
    }
  })
})

// var {getAMQPChannel} = require('../amqp_msgbroker/channel')
// let channel = getAMQPChannel()


function authenticate(req,res,next){
  const authheader = req.headers['authorization']
  const token = authheader && authheader.split(" ")[1]
  if(token===null){
    return res.sendStatus(401);
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,data)=>{
    if(err)
    return res.sendStatus(403);
    req.username = data.username
    req.accessToken = token
    next();
  })
  
}
/* GET home page. */
router.get('/', async function(req, res, next) {
  try{
    let result = await Order.find({})
    res.json(result);
  }
  catch(e){
    res.status(404).json(e)
  }
});

router.get('/:order_id', async (req,res,next)=>{
  try{
    let result = await Order.findById(req.params.order_id)
    res.json(result)
  }
  catch(e){
    res.status(400).json(e)
  }
})

router.post('/:product_name', authenticate, async (req,res,next)=>{
  try{
    let result = await axios.get(`http://localhost:8002/${req.params.product_name}`)
    let product= result.data;
    result = await axios.get(`http://localhost:8001/${req.username}`,{
      headers : {
        "Authorization" : `Bearer ${req.accessToken}`
      }
    })
    let user = result.data;
    let order = new Order({customer : user.name, product : req.params.product_name, price : product.price, address : req.body.address, mobile : req.body.mobile, status : "ORDER_CREATED"})
    await order.save()
    channel.sendToQueue('ORDER_CREATED',Buffer.from(JSON.stringify({
      order_id : order._id,
      product_id : product._id,
      customer_id : user._id,
      price : product.price
    })))
    res.json(order)
  }
  catch(e){
    return next(e)
  }
})

router.post('/:product_name',authenticate,async (req,res)=>{
  try{
    let result = await axios.get(`http://localhost:8002/${req.params.product_name}`)
    let product= result.data;
    result = await axios.get(`http://localhost:8001/${req.username}`,{
      headers : {
        "Authorization" : `Bearer ${req.accessToken}`
      }
    })
    let user = result.data;
    if(!user.bankaccount ){
      return res.status(400).json({message : 'Attach your bank account details', field : 'bankaccount'})
    }
    if(product.stock < 1){
      return res.status(400).json({message : 'Stock unavailable.', field : 'stock'})
    }
    result = await axios.post(`http://localhost:8002/updateStock/${req.params.product_name}`,{
      stock : -1
    },{
      headers : {
        "Authorization" : `Bearer ${req.accessToken}`
      }
    })
    result = await axios.post(`http://localhost:8001/updateBalance/${req.username}`,{
      amount : -product.price
    },{
      headers : {
        "Authorization" : `Bearer ${req.accessToken}`
      }
    })
    user = result.data;
    let order = new Order({customer : user.name, product : product.product_name, price : product.price, address : req.body.address, mobile : req.body.mobile})
    await order.save();
    res.json(order)
  }
  catch(e){
    res.status(400).json(e)
  }
})

module.exports = router;

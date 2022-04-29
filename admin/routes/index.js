var express = require('express');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const multer = require('multer');
const sharp = require('sharp')
const axios = require('axios')
const fs = require('fs')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images')
  },
  filename: function (req, file, cb) {
    const uniquePrefix= Date.now() + '-'
    cb(null, file.originalname)
  }
})
const upload = multer({ storage: storage });
const FormData = require('form-data');
var router = express.Router();

/* GET home page. */

function authenticate(req,res,next){
  const authheader = req.headers['authorization']
  const token = authheader && authheader.split(' ')[1]
  if(token===null)return res.status(401).json({message : "Forbidden"})
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,data)=>{
    if(err) return res.status(403).json({message : 'Unauthorized'});
    if(!data.admin) return res.status(403).json({message : "Unauthorized"})
    req.user = data
    req.token = token
    next()
  })
}


router.get('/', authenticate, function(req, res, next) {
  res.sendStatus(200)
});

router.get('/users', authenticate, async (req,res,next)=>{
  try{
    let result = await axios.get('http://localhost:8001/',{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`
      }
    })
    res.json(result.data);

  }
  catch(e){
    res.status(400).json(e.response.data)
  }
})

router.post('/addUser', authenticate, async (req,res,next)=>{
  try{
    let result = await axios.post('http://localhost:8001/register',req.body,{
      headers : {
        "Authorization" : `Bearer ${req.token}`
      }
    })
    res.status(200).json({message : "User registered successfully"})
  }
  catch(e){
    res.status(400).json(e.response.data)
  }
})

router.post('/updateUser/:name', authenticate, async (req,res,next)=>{
  try{
    let result = await axios.post(`http://localhost:8001/${req.params.name}`,req.body,{
      headers : {
        "Authorization" : `Bearer ${req.token}`
      }
    })
    res.status(200).json({message : "User registered successfully"})
  }
  catch(e){
    res.status(400).json(e.response.data)
  }
})

router.post('/deleteUser/:name', authenticate, async (req,res,next)=>{
  try{
    let result = await axios.delete(`http://localhost:8001/${req.params.name}`,{
      headers : {
        "Authorization" : `Bearer ${req.token}`
      }
    })
    res.status(200).json({message : "User deleted successfully"})
  }
  catch(e){
    res.status(400).json(e.response.data)
  }
})

router.post("/addProduct",authenticate,upload.single('image'),async (req,res,next)=>{
  try{
    let form = new FormData();
    form.append('product_parent',req.body.product_parent)
    form.append('product_name',req.body.product_name)
    form.append('price',req.body.price)
    form.append('stock',req.body.stock)
    form.append('description',req.body.description)
    form.append('category', req.body.category)
    form.append('token',req.body.token)
    form.append('image',fs.createReadStream(req.file.path))
    let result = await axios.post("http://localhost:8002/",form,{
      headers : {
        "Authorization" : `Bearer ${req.token}`,
        ...form.getHeaders()
      }
    })
    fs.unlinkSync(req.file.path)  
    res.status(200).json({message : "Product added successfully"})
  }
  catch(e){
    console.log(e)
    if(e.response === undefined)
    return next(e);
    console.log(e.response.data)
    res.status(400).json(e.response.data)
  }
})

router.get('/user/:name',authenticate,async (req,res,next)=>{
  try{
    let result = await axios.get(`http://localhost:8001/${req.params.name}`,{
      headers :{
        "Authorization" : `Bearer ${req.token}`,
      }
    })
    res.json(result.data)
  }
  catch(e){
    res.status(400).json({message : "User not found"})
  }
})

module.exports = router;

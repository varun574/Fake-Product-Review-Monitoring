var express = require('express');
const axios = require('axios')
const multer = require('multer');
const sharp = require('sharp')
const fs = require('fs')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images')
  },
  filename: function (req, file, cb) {
    const uniquePrefix= Date.now() + '-'
    cb(null, uniquePrefix+file.originalname)
  }
})
const upload = multer({ storage: storage });
const FormData = require('form-data');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.locals.loginmsg = req.flash('login-success')
  res.locals.token = req.flash('token')
  res.render('index',{username : req.session.username});
});

router.route('/register')
  .get((req,res)=>{
    let session = req.session;
    if(session.username){
      return res.redirect('/')
    }
    res.locals.message = req.flash('register-failure')
    res.locals.emailerr = req.flash('email')
    res.locals.passworderr = req.flash('password')
    res.locals.nameerr = req.flash('name')
    res.render('register',{username : req.session.username})
  })
  .post(async (req,res,next)=>{
    let session = req.session;
    if(session.username){
      return res.redirect('/')
    }
    try{
      let result = await axios.post("http://localhost:8001/register",{
        name : req.body.name,
        email : req.body.email,
        password : req.body.password
      })
      req.flash('register-success','Successfully Registered.')
      res.redirect('/login')
    }
    catch(e){
      if(e.response===undefined)
      return next(e);
      req.flash('register-failure','Registration unsuccessful, Please register again.')
      e.response.data.forEach(element => {
        req.flash(element.field,element.error)
      });
      res.redirect('/register')
    }

  })

router.route('/login')
  .get((req,res)=>{
    let session = req.session;
    if(session.username){
      return res.redirect('/')
    }
    res.locals.registermsg = req.flash('register-success')
    res.locals.loginmsg = req.flash('login-failure')
    res.locals.logoutmsg = req.flash('logout-success')
    res.locals.passworderr = req.flash('password')
    res.locals.nameerr = req.flash('name')
    res.render('login',{username : req.session.username})
  })
  .post(async (req,res,next)=>{
    let session = req.session;
    if(session.username){
      return res.redirect('/')
    }
    try{
      let result = await axios.post("http://localhost:8001/login",{
        token : req.body.token,
        name : req.body.name,
        email : req.body.email,
        password : req.body.password
      })
      session.username = req.body.name
      res.cookie('accessToken',result.data.token,{maxAge: 15*60*1000, httpOnly: true })
      req.flash('login-success','Successfully Logged in.')
      res.redirect('/')
    }
    catch(e){
      if(e.response===undefined)
      return next(e);
      req.flash('login-failure','Login unsuccessful, Please login again.')
      if(e.response){
        e.response.data.forEach(element => {
          req.flash(element.field,element.error)
        });
      }
      res.redirect('/login')
    }
  })

router.get('/logout',(req,res)=>{
  let session = req.session;
  if(session.username===null){
    return res.redirect('/login')
  }
  req.session.username=null
  res.clearCookie('accessToken')
  req.flash('logout-success','Successfully logged out')
  res.redirect('/login')
})

router.route('/products')
  .get(async (req,res)=>{
    try{
      let result = await axios.get("http://localhost:8002/")
      let username = req.session.username
      res.render('products',{products : result.data,username : username, message : ""})
    }
    catch(e){
      res.render('error',{message : 'Not found',error : { status : 404}})
    }
})
router.get('/product/:product_name',async (req,res,next)=>{
  try{
    let result = await axios.get(`http://localhost:8002/${req.params.product_name}`)
    res.render('product',{username : req.session.username, product : result.data, reviews : result.data.reviews})
  }
  catch(e){
    res.sendStatus(400)
  }
})

router.get('/products/category/:category',async (req,res,next)=>{
  try{
    let result = await axios.get(`http://localhost:8002/category/${req.params.category}`)
    if(result.data.length===0){
      return res.render('products',{username : req.session.username, message : "There are no available products under this category", products : result.data})
    }
    res.render('products',{products : result.data, username : req.session.username,message : ""})
  }
  catch(e){
    next(e)
  }
})

router.get('/purchase/:product_name',async (req,res,next)=>{
    let session = req.session;
    if(!session.username){
      return res.redirect('/login')
    }
    let result = await axios.get(`http://localhost:8001/${session.username}`,{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`
      }
    })
    let user= result.data
    let address = '';
    if(user.address){
      if(user.address.area)
      address+=user.address.area+','
      if(user.address.city)
      address+=user.address.city+','
      if(user.address.state)
      address+=user.address.state+'.'
    }
    result = await axios.get(`http://localhost:8002/${req.params.product_name}`)
    let product = result.data
    res.locals.message = req.flash('message')
    if(req.flash('bankaccount').length!==0){
      return res.redirect(`/profile/edit/${session.username}/banking`)
    }
    res.render(`purchase`,{username : session.username,address , mobile : user.mobile, product})
})

router.post('/purchase/:product_name',async (req,res,next)=>{
  try{
    let session = req.session;
    if(!session.username){
      return res.redirect('/login')
    }
    if(!req.body.address || !req.body.mobile){
      req.flash('message','All fields are mandatory')
      return res.redirect(`/purchase/${req.params.product_name}`)
    }
    let result = await axios.post(`http://localhost:8003/${req.params.product_name}`,{
      name : req.body.name,
      address : req.body.address,
      mobile : req.body.mobile
    },{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`
      }
    })
    // res.render('order',{username :session.username, order : result.data})
    res.redirect(`/order/${result.data._id}`)
  }
  catch(e){
    if(e.response===undefined)
    return next(e);
    console.log(e)
    req.flash('purchase-failure','Purchase unsuccessful, Please try again later.')
    if(e.response){
      req.flash(e.response.data.field,e.response.data.message)
    }
    res.redirect(`/purchase/${req.params.product_name}`)
  }
})

router.get('/order/:order_id',async (req,res,next)=>{
  if(!req.session.username)
  res.redirect('/login')
  try{
    let result = await axios.get(`http://localhost:8003/${req.params.order_id}`)
    res.render('order',{username : req.session.username, order : result.data})
  }
  catch(e){
    console.log(e)
    if(e.response===undefined)
    return next(e)
    res.status(400).json(e)
  }

})

router.post('/rate/:product_name', async (req,res,next)=>{
  if(!req.session.username)
  res.redirect('/login')
  try{
    let result = await axios.post(`http://localhost:8002/rate/${req.params.product_name}`,{
      name : req.body.name,
      rating : req.body.rating
    },{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`
      }
    })
    res.json(result.data)
  }
  catch(e){
    if(e.response===undefined)
    return next(e)
    res.status(400).json(e)
  }
})

router.post('/review/like',async (req,res,next)=>{
  try{
    let result = await axios.post('http://localhost:8002/review/like',{
      author : req.body.author,
      review_id : req.body.review_id,
      product_name : req.body.product_name
    },{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`
      }
    })
    res.json(result.data)
  }
  catch(e){
    if(e.response===undefined)
    return next(e);
    req.flash('message','Could not like, please try again')
    res.status(400).json(e)
  }
})

router.post('/review/:product_name',async (req,res,next)=>{
  try{
    let session = req.session
    if(!session.username)
    return res.redirect('/login')
    await axios.post(`http://localhost:8002/review/${req.params.product_name}`,{
      author : session.username,
      reviewBody : req.body.reviewBody,
      reviewHead : req.body.reviewHead,
      product_name : req.params.product_name
    },
    {
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`
      }
    })
    res.redirect(`/product/${req.params.product_name}`)
  }
  catch(e){
    if(e.response===undefined)
      return next(e);
    req.flash('add-failure','Product save unsuccessful.Please add again.')
    e.response.data.forEach(element => {
      req.flash(element.field,element.error)
    });
    res.redirect(`/product/${req.params.product_name}`)
  }
})

router.post('/search',async (req,res,next)=>{
  try{
    let result = await axios.get(`http://localhost:8002/${req.body.product_name}`)
    res.render('product',{username : req.session.username, product : result.data})
  }
  catch(e){
    res.sendStatus(400)
  }
})




router.route('/addproduct')
  .get(async (req,res)=>{
    let session = req.session
    if(session.username){
      let result = await axios.get(`http://localhost:8001/${session.username}`)
      console.log(result)
      if(!(result.data.isadmin))
      return res.redirect('/')
      res.locals.product_nameerr = req.flash('product_name')
      res.locals.priceerr = req.flash('price')
      res.locals.descriptionerr = req.flash('description')
      res.locals.imageerr = req.flash('image')
      res.locals.categoryerr = req.flash('category')
      res.locals.stockerr = req.flash('stock')
      res.render('addproduct',{username : session.username || ""})
    }
    else{
      return res.sendStatus(404);
    }
    
})
.post(upload.single('image'),async (req,res)=>{
  try{
    let form = new FormData();
    form.append('product_name',req.body.product_name)
    form.append('price',req.body.price)
    form.append('description',req.body.description)
    form.append('token',req.body.token)
    form.append('image',fs.createReadStream(req.file.path))
    let result = await axios.post("http://localhost:8002/",form,{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
        ...form.getHeaders()
      }
    })
    fs.unlinkSync(req.file.path)  
    req.flash('add-success','Successfully added the product.')
    res.redirect('/products')
  }
  catch(e){
    if(e.response===undefined)
      return next(e);
    req.flash('add-failure','Product save unsuccessful.Please add again.')
    e.response.data.forEach(element => {
      req.flash(element.field,element.error)
    });
    res.redirect('/addproduct')
  }
})



module.exports = router;

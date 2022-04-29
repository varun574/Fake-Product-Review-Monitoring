const express = require('express')
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
    cb(null, uniquePrefix+file.originalname)
  }
})
const upload = multer({ storage: storage });
const FormData = require('form-data');
var router = express.Router()

router.get('/', async (req,res,next)=>{
    if(!(req.session.username))
    return res.redirect('/login')
    try{
        let result = await axios.get('http://localhost:8004/',{
            headers : {
                "Authorization" : `Bearer ${req.cookies.accessToken}`,
            }
        })
        res.render("admin", {username : req.session.username})
    }
    catch(e){
        res.redirect('/login')
    }
})

router.route('/addUser')
.get(async (req,res,next)=>{
    if(!(req.session.username))
    return res.redirect('/login')
    try{
        let result = await axios.get('http://localhost:8004/',{
            headers : {
                "Authorization" : `Bearer ${req.cookies.accessToken}`,
            }
        })
        res.locals.message = req.flash('register-failure')
        res.locals.emailerr = req.flash('email')
        res.locals.passworderr = req.flash('password')
        res.locals.nameerr = req.flash('name')
        res.render("admin_adduser", {username : req.session.username})
    }
    catch(e){
        res.redirect('/admin')
    }
})
.post(async (req,res,next)=>{
    if(!(req.session.username))
    return res.redirect('/login')
    try{
        let result = await axios.post('http://localhost:8004/addUser',req.body,{
            headers : {
                "Authorization" : `Bearer ${req.cookies.accessToken}`,
            }
        })
        res.redirect('/admin')
    }
    catch(e){
        if(e.response === undefined)
        return next(e);
        req.flash('register-failure','Registration unsuccessful, Please register again.')
        e.response.data.forEach(element => {
            req.flash(element.field,element.error)
        });
        res.redirect('/admin/addUser')
    }
})

router.route('/editUser')
.get(async (req,res,next)=>{
    if(!(req.session.username))
    return res.redirect('/login')
    try{
        let result = await axios.get('http://localhost:8004/users',{
            headers : {
                "Authorization" : `Bearer ${req.cookies.accessToken}`,
            }
        })
        res.render("admin_edituser", {username : req.session.username,users : result.data})
    }
    catch(e){
        res.redirect('/admin')
    }
})

router.route('/updateUser/:name')
.get(async (req,res,next)=>{
  if(!(req.session.username))
    return res.redirect('/login')
  try{
    let result = await axios.get(`http://localhost:8004/user/${req.params.name}`,{
      headers : {
          "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    res.locals.message = req.flash('register-failure')
    res.locals.emailerr = req.flash('email')
    res.locals.passworderr = req.flash('password')
    res.locals.nameerr = req.flash('name')
    res.locals.mobileerr = req.flash('mobile')
    res.locals.areaerr = req.flash('area')
    res.locals.cityerr = req.flash('city')
    res.locals.stateerr = req.flash('state')
    res.render('admin_updateuser',{username : req.session.username, user : result.data})
  }
  catch(e){
    res.redirect('/admin')
  }
})
.post(async (req,res,next)=>{
  if(!(req.session.username))
  return res.redirect('/login')
  try{
    let result = await axios.post(`http://localhost:8004/updateUser/${req.params.name}`,req.body,{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    res.redirect(`/admin/updateUser/${req.params.name}`)
  }
  catch(e){
    if(e.response === undefined)
    return next(e);
    req.flash('update-failure','Update unsuccessful, Please update again.')
    e.response.data.forEach(element => {
        req.flash(element.field,element.error)
    });
    res.redirect(`/admin/updateUser/${req.params.name}`)
  }
})

router.route('/deleteUser/:name')
.get(async (req,res,next)=>{
  if(!(req.session.username))
  return res.redirect('/login')
  try{
    let result = await axios.get(`http://localhost:8004/user/${req.params.name}`,{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    res.render('admin_deleteuser',{username : req.session.username, user : result.data})
  }
  catch(e){
    res.redirect('/admin/editUser')
  }
})
.post(async (req,res,next)=>{
  if(!(req.session.username))
  return res.redirect('/login')
  try{
    let result = await axios.post(`http://localhost:8004/deleteUser/${req.params.name}`,{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    res.redirect('/admin/editUser')
  }
  catch(e){
    res.redirect('/admin/editUser')
  }
})

router.route('/addProduct')
  .get(async (req,res)=>{
    let session = req.session
    if(!session.username)
    return res.redirect("/login")
      let result = await axios.get(`http://localhost:8004/`,{
        headers : {
            "Authorization" : `Bearer ${req.cookies.accessToken}`,
        }
      })
      res.locals.product_nameerr = req.flash('product_name')
      res.locals.priceerr = req.flash('price')
      res.locals.descriptionerr = req.flash('description')
      res.locals.imageerr = req.flash('image')
      res.locals.categoryerr = req.flash('category')
      res.locals.stockerr = req.flash('stock')
      res.locals.product_parent = req.flash('product_parent')
      res.render('addproduct',{username : session.username || ""})
    
})
.post(upload.single('image'),async (req,res,next)=>{
  try{
    if(req.file===undefined){
        req.flash('image','Image must be uploaded');
        return res.redirect('/admin/addProduct');
    }
    let form = new FormData();
    form.append('product_parent',req.body.product_parent)
    form.append('product_name',req.body.product_name)
    form.append('price',req.body.price)
    form.append('stock',req.body.stock)
    form.append('description',req.body.description)
    form.append('category', req.body.category)
    form.append('token',req.body.token)
    form.append('image',fs.createReadStream(req.file.path))
    let result = await axios.post("http://localhost:8004/addProduct",form,{
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
    res.redirect('/admin/addProduct')
  }
})

router.get("/reviews", async (req,res,next)=>{
  if(!req.session.username)
  return res.redirect('/login')
  try{
    let result = await axios.get("http://localhost:8002/review/",{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    res.render("reviews",{reviews : result.data, username : req.session.username})
  }
  catch(e){
    console.log(e);
    if(e.response===undefined)
      return next(e);
    res.redirect('/')
  }
})

router.get("/monitor",async  (req,res,next)=>{
  if(!req.session.username)
  return res.redirect('/login')
  try{
    let result = await axios.get("http://localhost:8002/review/",{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    let reviews = result.data
    result = await axios.post("http://localhost:5000/monitor",{
      reviews
    },{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    await axios.post("http://localhost:8002/review/monitor",result.data,{
      headers : {
        "Authorization" : `Bearer ${req.cookies.accessToken}`,
      }
    })
    res.redirect("/reviews");
  }
  catch(e){
    if(e.response===undefined)
      return next(e);
    res.redirect('/')
  }
})

module.exports = router
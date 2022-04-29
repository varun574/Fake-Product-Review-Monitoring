var express = require('express');
const axios = require('axios');

let router = express.Router()
router.get('/',async (req,res,next)=>{
    try{
        if(!req.session.username)
        res.redirect('/login')
      let result = await axios.get(`http://localhost:8001/${req.session.username}`,{
        headers : {
          "Authorization" : `Bearer ${req.cookies.accessToken}`
        }
      })
      res.render('profile',{username : req.session.username,user : result.data})
    }
    catch(e){
        if(e.response===undefined)
        return next(e);
      e.response.data.forEach(element => {
        req.flash(element.field,element.error)
      });
      res.redirect('/')
    }
})

router.route('/edit/:username/credentials')
.get(async (req,res,next)=>{
    try{
        if(!req.session.username)
        res.redirect('/login')
        let result = await axios.get('http://localhost:8001/profile',{
          headers : {
            "Authorization" : `Bearer ${req.cookies.accessToken}`
          }
        })
        res.locals.message = req.flash('update_success')
        res.locals.name = req.flash('name')
        res.locals.email = req.flash('email')
        res.locals.password = req.flash('password')
        res.render('editcredentials',{username : req.session.username,user : result.data.user})
    }
    catch(e){
        if(e.response===undefined)
        return next(e);
        e.response.data.forEach(element => {
          req.flash(element.field,element.error)
        });
        res.redirect('/')
    }
})
.post(async (req,res,next)=>{
    try{
        if(!req.session.username)
        res.redirect('/login')
        let result = await axios.post(`http://localhost:8001/${req.body.name}`,{
            name : req.body.name,
            email : req.body.email,
            password : req.body.password,
        },{
            headers : {
                "Authorization" : `Bearer ${req.cookies.accessToken}`
            }
        })
        req.flash('update_success','Successfully Updated')
        res.redirect('credentials')
    }
    catch(e){
        if(e.response===undefined)
        return next(e);
        e.response.data.forEach(element => {
            req.flash(element.field,element.error)
        });
        res.redirect('/')
    }
})

router.route('/edit/:username/personal')
.get(async (req,res,next)=>{
    try{
        if(!req.session.username)
        res.redirect('/login')
        let result = await axios.get('http://localhost:8001/profile',{
          headers : {
            "Authorization" : `Bearer ${req.cookies.accessToken}`
          }
        })
        res.locals.name = req.flash('name')
        res.locals.address = req.flash('address')
        res.locals.mobile = req.flash('mobile')
        res.locals.message = req.flash('update_success')
        res.render('editpersonal',{username : req.session.username,user : result.data.user})
    }
    catch(e){
        if(e.response===undefined)
        return next(e);
        e.response.data.forEach(element => {
          req.flash(element.field,element.error)
        });
        res.redirect('/')
    }
})
.post(async (req,res,next)=>{
    try{
        if(!req.session.username)
        res.redirect('/login')
        let result = await axios.post(`http://localhost:8001/${req.body.name}`,{
            name : req.body.name,
            mobile : req.body.mobile,
            address : {
                area : req.body.area,
                city : req.body.city,
                state : req.body.state
            }
        },{
            headers : {
                "Authorization" : `Bearer ${req.cookies.accessToken}`
            }
        })
        req.flash('update_success','Successfully Updated')
        res.redirect('personal')
    }
    catch(e){
        if(e.response===undefined)
        return next(e);
        e.response.data.forEach(element => {
            req.flash(element.field,element.error)
        });
        res.redirect('/')
    }
})

router.route('/edit/:username/banking')
.get(async (req,res,next)=>{
    try{
        if(!req.session.username)
        res.redirect('/login')
        let result = await axios.get('http://localhost:8001/profile',{
          headers : {
            "Authorization" : `Bearer ${req.cookies.accessToken}`
          }
        })
        res.locals.bankname = req.flash('bankname')
        res.locals.account_number = req.flash('account_number')
        res.locals.message = req.flash('update_success')
        res.render('editbanking',{username : req.session.username,user : result.data.user})
    }
    catch(e){
        if(e.response===undefined)
        return next(e);
        e.response.data.forEach(element => {
          req.flash(element.field,element.error)
        });
        res.redirect('/')
    }
})
.post(async (req,res,next)=>{
    try{
        if(!req.session.username)
        res.redirect('/login')
        let result = await axios.post(`http://localhost:8001/${req.session.username}`,{
            bankaccount : {
                bankname : req.body.bankname,
                account_number : req.body.account_number,
            }
        },{
            headers : {
                "Authorization" : `Bearer ${req.cookies.accessToken}`
            }
        })
        req.flash('update_success','Successfully Updated')
        res.redirect('banking')
    }
    catch(e){
        if(e.response===undefined)
        return next(e);
        e.response.data.forEach(element => {
            req.flash(element.field,element.error)
        });
        res.redirect('/')
    }
})

router.use((req,res,next)=>{
    return res.sendStatus(404)
})

module.exports = router
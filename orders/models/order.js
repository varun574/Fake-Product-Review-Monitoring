const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    customer : {
        type : String,
        required : [true,'Customer name is required']
    },
    product : {
        type : String,
        required : [true,'Product name is required']
    },
    price : {
        type : Number,
        required : [true,'Amount is required']
    },
    address : {
        type : String,
        required : [true,'Address is required']
    },
    mobile : {
        type : String,
        required : [true,'Mobile number is required']
    },
    status : {
        type : String,
        required : true
    },
    date : {
        type : Date,
        default : ()=>new Date(Date.now()),
        required : true
    },
})

module.exports = mongoose.model('order',orderSchema,'orders')
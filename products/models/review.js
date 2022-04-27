const mongoose = require('mongoose')
const reviewSchema = new mongoose.Schema({
    author : {
        type : String,
        required : [true,'Author name is required']
    },
    product_id : {
        type : String,
        required : [true,'product id is required']
    },
    product_parent : {
        type : String,
        required : [true, 'Product parent is required'],
    },
    reviewHead : {
        type : String
    },
    reviewBody : {
        type : String,
        required : [true,'Review is required']
    },
    review_type : {
        type : String,
        enum : ['real','fake'],
        default : 'real'
    },
    product_name : {
        type : String,
        required : [true,'Product name is required']
    },
    verified_purchase : {
        type : Boolean,
        default : false
    },
    helpful : {
        type : Number,
        default : 0
    },
    likedBy : {
        type : [String],
    },
    rating : {
        type : Number
    },
    timestamp : {
        type : Number,
        default : ()=>{
            return Math.floor(Date.now()/1000)
        }
    },
    ip_address : {
        type : String
    },
    date : {
        type : Date,
        default : ()=>{
            return new Date(Date.now()).toISOString().slice(0,10)
        }
    }
})
var Review = mongoose.model('Review',reviewSchema,'reviews')
module.exports = {Review,reviewSchema}
const mongoose = require('mongoose')
const reviewSchema = new mongoose.Schema({
    reviewHead : {
        type : String
    },
    reviewBody : {
        type : String,
        required : [true,'Review is required']
    },
    author : {
        type : String,
        required : [true,'Author name is required']
    },
    product_name : {
        type : String,
        required : [true,'Product name is required']
    },
    helpful : {
        type : Number,
        default : 0
    },
    likedBy : {
        type : [String],
    },
    date : {
        type : Date,
        default : ()=>{
            new Date(Date.now())
        }
    }
})
var Review = mongoose.model('Review',reviewSchema,'reviews')
module.exports = {Review,reviewSchema}
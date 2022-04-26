const mongoose = require('mongoose')
const {reviewSchema, Review} =require('./review')

const productSchema = new mongoose.Schema({
    product_name : {
        type : String,
        required : [true,"Product Name is required"]
    },
    price : {
        type : Number,
        required : [true,'Price is required'] 
    },
    description : {
        type : String,
        required : [true,'Description is required']
    },
    category : {
        type : String,
        enum : ['Electronics','Video Games','Appliances','Furniture','Books'],
        required : [true,'Category must be selected']
    },
    image : {
        type :String,
    },
    stock : {
        type : Number,
        required : [true,'Stock is required']
    },
    ratings : {
        type : [{ rating : Number, name : String }]
    },
    reviews : {
        type : [{type : mongoose.Schema.Types.ObjectId, ref : Review}]
    }
})
// productSchema.path('product_name').validate(async (value)=>{
//     console.log(this)
//     const count = await mongoose.model('product').countDocuments({product_name : value});
//     return !count;
// },`Product {VALUE} as name already exists`,'Invalid Product Name')

productSchema.pre(['validate'],function(next) {
    var product = this
    mongoose.model("product").findOne({product_name : product.product_name}, 'product_name',function(err, results) {
        if(err) {
            next(err);
        } else if(results) { //there was a result found, so the email address exists
            next(product.invalidate("product_name","product_name must be unique"));
        } else {
            next();
        }
    });
});

module.exports = mongoose.model("product",productSchema)
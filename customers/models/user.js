const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true,'Name is required'],
        unique : true
    },
    email : {
        type : String,
        lowercase : true,
        required : [true,'Email is required'],
        validate : {
            validator : function(value){
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(value);
            },
            message : 'Email is invalid'
        }
    },
    password : {
        type : String,
        required : [true,'Password is required'],
        validate : {
            validator : function(value){
                return value.length>=8
            },
            message : 'Password must contain minimum 8 characters'
        }
    },
    mobile : {
        type : String,
        validate : {
            validator : function(value){
                return /^\d{10}$/.test(value)
            },
            message : "Phone number must contain 10 digits"
        }
    },
    address : {
        area : String,
        city : String,
        state : String
    },
    balance : {
        type : Number,
        default : 100000
    },
    bankaccount : {
        bankname : {
            type : String,
        },
        account_number : {
            type : String,
        },
    },
    helpful : {
        type : Number,
        default : 0
    },
    reviews : {
        type : Number,
        default : 0
    },
    isadmin : {
        type : Boolean,
        default : false
    }
})

UserSchema.path('name').validate(async (value)=>{
    const count = await mongoose.model('User').countDocuments({name : value});
    return !count;
},`Name with {VALUE} already exists`,'Invalid Username')

UserSchema.path('email').validate(async (value)=>{
    const count = await mongoose.model('User').countDocuments({email : value});
    return !count;
},`Email with {VALUE} already exists`,'Invalid Email')

module.exports = mongoose.model('User',UserSchema)

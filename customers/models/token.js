const mongoose = require('mongoose')
const authSchema = new mongoose.Schema({
    token : {
        type : String
    },
    name : {
        type : String
    }
})

module.exports = mongoose.model('Token',authSchema,'auth')
const mongoose = require('mongoose')
const connectionString  = 'mongodb+srv://admin:admin@cluster0.kkjin.mongodb.net/product?retryWrites=true&w=majority'

module.exports = {
    connectToServer : async function(){
        try{
            await mongoose.connect(connectionString);
        }
        catch(e){
            console.log('Failed to connect to the database')
        }
    }
}
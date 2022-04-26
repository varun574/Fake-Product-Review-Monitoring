const mongoose = require('mongoose');
const connectionString = "mongodb+srv://admin:admin@cluster0.kkjin.mongodb.net/order?retryWrites=true&w=majority"
module.exports={
    connectToServer : async function(){
        try{
            return await mongoose.connect(connectionString);
        }
        catch(e){
            return e;
        }
    }
}
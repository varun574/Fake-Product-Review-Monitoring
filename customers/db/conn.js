const mongoose = require("mongoose");
let connectionString = "mongodb+srv://admin:admin@cluster0.kkjin.mongodb.net/customer?retryWrites=true&w=majority";

module.exports={
    connectToServer : function(){
        try{
            return  mongoose.connect(connectionString);
        }
        catch(e){
            console.log("Error connecting to database");
        }
    }
}
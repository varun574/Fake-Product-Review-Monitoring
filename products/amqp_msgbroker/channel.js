const amqp = require('amqplib')

let channel;
async function connect(){
    try{
        let connection = await amqp.connect('amqp://localhost:5672')
        channel = await connection.createChannel()
        await Promise.all([channel.assertQueue('ORDER_PAID'),channel.assertQueue('ORDER_PREPARED'),channel.assertQueue('PREPARE_FAILED')])
    }
    catch(e){
        console.log(e);
        throw e;
    }
}

function getAMQPChannel(){
    return channel
}

module.exports = {
    connect,getAMQPChannel
}


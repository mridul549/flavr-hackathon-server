const Queue = require('bull')
const path  = require('path')
const redis = require('redis');

const client = redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

client.connect();

// Event listener for Redis 
client.on('connect', () => {
    console.log('Connected to Redis Cloud');
});

client.on('error', (err) => {
    console.error('Redis Error:', err);
});

const orderQueue = new Queue('orderQueue', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME
    }
})

orderQueue.process(path.join(__dirname, 'orderQueueProcess.js'))

orderQueue.on('completed', (job) => {
    console.log(`Completed #${job.id} Job of outlet ${job.data.outletid}`);
})

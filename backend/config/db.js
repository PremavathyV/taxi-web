/**
 * config/db.js
 * MongoDB Atlas connection using Mongoose
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('⚠️  Server will keep running. Update MONGO_URI in .env to connect.');
    // Do NOT exit — let the server stay up so routes can return a clear DB error
  }
};

module.exports = connectDB;

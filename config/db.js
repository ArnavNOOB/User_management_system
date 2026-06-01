const mongoose = require('mongoose');

/**
 * Establishes connection to the MongoDB Atlas Database
 */
const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    
    // Check if the URI contains placeholders or is missing
    if (!connStr || connStr.includes('<username>') || connStr.includes('<cluster-url>')) {
      console.error('\n================================================================');
      console.error('ERROR: MongoDB Atlas Connection URI is not configured.');
      console.error('Please configure the MONGODB_URI inside the .env file with your');
      console.error('actual database username, password, and cluster URL.');
      console.error('================================================================\n');
      process.exit(1);
    }

    const conn = await mongoose.connect(connStr);
    console.log(`Successfully connected to MongoDB Atlas: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

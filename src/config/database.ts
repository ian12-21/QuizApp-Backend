import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get MongoDB URI from environment variables or use default
const MONGODB_URI = process.env.MONGODB_URI || "";

// Connect to MongoDB
export const connectToDatabase = async (): Promise<void> => {
  try {
    // Ensure we're connecting to the 'quiz' database
    // If MONGODB_URI already has a database specified, this will override it
    const connectionOptions = {
      dbName: 'quiz' // Explicitly set the database name to 'quiz'
    };
    
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('Connected to MongoDB quiz database successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Disconnect from MongoDB
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

// Export the mongoose instance
export default mongoose;

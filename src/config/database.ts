import mongoose from 'mongoose';
import config from './index';

export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.db.uri, { dbName: config.db.name });
    console.log('Connected to MongoDB quiz database successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

export default mongoose;

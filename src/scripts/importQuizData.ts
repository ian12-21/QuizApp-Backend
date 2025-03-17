import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { connectToDatabase, disconnectFromDatabase } from '../config/database';
import Quiz from '../models/Quiz';

// Load environment variables
dotenv.config();

/**
 * Script to import quiz data from quiz-data.json to MongoDB
 */
const importQuizData = async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('Connected to MongoDB');

    // Path to quiz-data.json
    const dataFilePath = path.join(__dirname, '../../quiz-data.json');
    
    // Check if file exists
    if (!fs.existsSync(dataFilePath)) {
      console.error('quiz-data.json file not found');
      process.exit(1);
    }

    // Read and parse the JSON file
    const data = fs.readFileSync(dataFilePath, 'utf8');
    const quizzes = JSON.parse(data);
    
    // Count of quizzes to import
    const quizCount = Object.keys(quizzes).length;
    console.log(`Found ${quizCount} quizzes to import`);

    // Import each quiz
    let importedCount = 0;
    let skippedCount = 0;

    for (const [pin, quizData] of Object.entries(quizzes)) {
      // Check if quiz with this pin already exists
      const existingQuiz = await Quiz.findOne({ pin });
      
      if (existingQuiz) {
        console.log(`Quiz with pin ${pin} already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Create new quiz in MongoDB with explicit typing
      const quizDataObj = quizData as {
        creatorAddress: string;
        quizAddress: string;
        quizName: string;
        answersHash: string;
        playerAddresses: string[];
        questions: {
          question: string;
          answers: string[];
          correctAnswer: number;
        }[];
      };

      await Quiz.create({
        pin,
        creatorAddress: quizDataObj.creatorAddress,
        quizAddress: quizDataObj.quizAddress,
        quizName: quizDataObj.quizName,
        answersHash: quizDataObj.answersHash,
        playerAddresses: quizDataObj.playerAddresses,
        questions: quizDataObj.questions
      });
      
      importedCount++;
      console.log(`Imported quiz with pin ${pin}`);
    }

    console.log(`Import complete: ${importedCount} imported, ${skippedCount} skipped`);
    
    // Disconnect from MongoDB
    await disconnectFromDatabase();
    
  } catch (error) {
    console.error('Error importing quiz data:', error);
    process.exit(1);
  }
};

// Run the import
importQuizData();

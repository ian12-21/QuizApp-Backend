import dotenv from 'dotenv';
import { connectToDatabase, disconnectFromDatabase } from '../config/database';
import Quiz from '../models/Quiz';

// Load environment variables
dotenv.config();

/**
 * Script to retrieve a quiz from the database by PIN
 */
const getQuiz = async (pin: string) => {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('Connected to MongoDB');

    // Find the quiz by PIN
    const quiz = await Quiz.findOne({ pin });
    
    if (!quiz) {
      console.log(`Quiz with PIN ${pin} not found`);
      return;
    }
    
    // Display quiz details
    console.log('Quiz found:');
    console.log('PIN:', quiz.pin);
    console.log('Name:', quiz.quizName);
    console.log('Creator Address:', quiz.creatorAddress);
    console.log('Quiz Address:', quiz.quizAddress);
    console.log('Number of Questions:', quiz.questions.length);
    console.log('Number of Players:', quiz.playerAddresses.length);
    
    // Display questions
    console.log('\nQuestions:');
    quiz.questions.forEach((q, index) => {
      console.log(`\nQuestion ${index + 1}: ${q.question}`);
      console.log('Answers:');
      q.answers.forEach((a, i) => {
        console.log(`  ${i}: ${a}${i === q.correctAnswer ? ' (Correct)' : ''}`);
      });
    });

    // Disconnect from MongoDB
    await disconnectFromDatabase();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error retrieving quiz:', error);
    // Ensure we disconnect from the database even if there's an error
    await disconnectFromDatabase();
    process.exit(1);
  }
};

// Get the PIN from command line arguments or use the default
const pin = process.argv[2] || '456795'; // Default to the PIN of the test quiz we just added
getQuiz(pin);

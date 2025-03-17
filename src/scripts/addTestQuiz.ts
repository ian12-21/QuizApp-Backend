import dotenv from 'dotenv';
import { connectToDatabase, disconnectFromDatabase } from '../config/database';
import { QuizService } from '../services/quizService';

// Load environment variables
dotenv.config();

/**
 * Script to add a test quiz to the database using the structure from quiz-data.json
 */
const addTestQuiz = async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('Connected to MongoDB');

    // Create quiz service instance
    const quizService = new QuizService();

    // Generate a random 6-digit PIN that's different from existing ones
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create test quiz data based on the structure in quiz-data.json
    const testQuiz = {
      pin,
      creatorAddress: '0xa95bcdfec541ead7793f8857751ebb0f2060f442',
      quizAddress: '0xa5783e3FEAa3e2327c51D0487011190Ce3d04e9f',
      quizName: 'Test General Knowledge Quiz',
      answersHash: '0xc142998558cf4d37a6ebd5922d96855166ddca61d387fcbccf899ff25a6692a4',
      playerAddresses: [
        '0xb742FbB7Af14551aCfbaca23FEDAeE4a680c3E96',
        '0x6cfa0Ab2d4206401518b9472f6713AB848b51FA3',
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
        '0x0000000000000000000000000000000000000003'
      ],
      questions: [
        {
          question: 'What is the capital of France?',
          answers: [
            'London',
            'Paris',
            'Berlin',
            'Madrid'
          ],
          correctAnswer: 1
        },
        {
          question: 'Which planet is known as the Red Planet?',
          answers: [
            'Venus',
            'Mars',
            'Jupiter',
            'Saturn'
          ],
          correctAnswer: 1
        },
        {
          question: 'What is the largest mammal in the world?',
          answers: [
            'Elephant',
            'Blue Whale',
            'Giraffe',
            'Polar Bear'
          ],
          correctAnswer: 1
        },
        {
          question: 'Who wrote "Romeo and Juliet"?',
          answers: [
            'Charles Dickens',
            'Jane Austen',
            'William Shakespeare',
            'Mark Twain'
          ],
          correctAnswer: 2
        }
      ]
    };

    // Create the quiz using the quiz service
    const result = await quizService.createQuiz(
      testQuiz.pin,
      testQuiz.creatorAddress,
      testQuiz.quizAddress,
      testQuiz.quizName,
      testQuiz.answersHash,
      testQuiz.playerAddresses,
      testQuiz.questions
    );

    console.log('Test quiz created successfully!');
    console.log('Quiz PIN:', testQuiz.pin);
    console.log('Quiz Name:', testQuiz.quizName);
    console.log('Number of questions:', testQuiz.questions.length);

    // Disconnect from MongoDB
    await disconnectFromDatabase();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error adding test quiz:', error);
    // Ensure we disconnect from the database even if there's an error
    await disconnectFromDatabase();
    process.exit(1);
  }
};

// Run the function
addTestQuiz();

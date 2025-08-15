import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for a question
export interface IQuestion {
  question: string;
  answers: string[];
  correctAnswer: number;
}

// Define the interface for a quiz document
export interface IQuiz extends Document {
  pin: string;
  creatorAddress: string;
  quizAddress: string;
  quizName: string;
  answersHash: string;
  playerAddresses: string[];
  questions: IQuestion[];
  winner: { userAddress: string, score: number };
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema for questions
const QuestionSchema = new Schema<IQuestion>({
  question: { type: String, required: true },
  answers: { type: [String], required: true },
  correctAnswer: { type: Number, required: true }
});

// Create the schema for quizzes
const QuizSchema = new Schema<IQuiz>({
  pin: { type: String, required: true, unique: true },
  creatorAddress: { type: String, required: true },
  quizAddress: { type: String, required: true },
  quizName: { type: String, required: true },
  answersHash: { type: String, required: true },
  playerAddresses: { type: [String], required: true },
  questions: { type: [QuestionSchema], required: true },
  winner: { type: { userAddress: String, score: Number }, default: { userAddress: '', score: 0 } }
}, { timestamps: true });

// Create and export the model
// The third parameter specifies the exact collection name to use in MongoDB
export default mongoose.model<IQuiz>('Quiz', QuizSchema, 'quiz_app');

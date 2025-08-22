import mongoose, { Schema, Document } from "mongoose";

// Interface for a single user's answer to a specific question
interface IUserQuestionAnswer {
  questionIndex: number;
  selectedOption: number;
  answerTimeMs: number; // Time taken to answer in milliseconds
}

// Interface for a single user's answers collection
interface IUserAnswers {
  userAddress: string;
  answers: IUserQuestionAnswer[];
  score: number;
  totalAnswerTimeMs: number; // Total time taken for all answers in milliseconds
}

// Define the interface for the entire answers document for a quiz
export interface IQuizAnswers extends Document {
  quizAddress: string;
  participants: IUserAnswers[];
}

// Create the schema for individual answers
const UserQuestionAnswerSchema = new Schema({
  questionIndex: { type: Number, required: true },
  selectedOption: { type: Number, required: true },
  answerTimeMs: { type: Number, required: true, default: 0 },
});

// Create the schema for user answers
const UserAnswersSchema = new Schema({
  userAddress: { type: String, required: true },
  answers: [UserQuestionAnswerSchema],
  score: { type: Number, required: true, default: 0 },
  totalAnswerTimeMs: { type: Number, required: true, default: 0 }
});

// Create the schema for all quiz answers
const QuizAnswersSchema = new Schema<IQuizAnswers>({
  quizAddress: { type: String, required: true, unique: true, index: true },
  participants: [UserAnswersSchema]
}, { timestamps: true });

// Add index for faster lookups when finding a specific user's answers
QuizAnswersSchema.index({ "participants.userAddress": 1 });

// Create and export the model
export default mongoose.model<IQuizAnswers>("QuizAnswers", QuizAnswersSchema, "quiz_answers");
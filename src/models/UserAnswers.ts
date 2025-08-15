import mongoose, { Schema, Document } from "mongoose";

// Interface for a single user's answer to a specific question
interface IUserQuestionAnswer {
  questionIndex: number;
  selectedOption: number;
}

// Interface for a single user's answers collection
interface IUserAnswers {
  userAddress: string;
  answers: IUserQuestionAnswer[];
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
});

// Create the schema for user answers
const UserAnswersSchema = new Schema({
  userAddress: { type: String, required: true },
  answers: [UserQuestionAnswerSchema]
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
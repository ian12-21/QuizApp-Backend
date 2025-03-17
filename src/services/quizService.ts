import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Quiz, { IQuiz } from '../models/Quiz';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

export class QuizService {
    private readonly storageFile: string;

    constructor() {
        this.storageFile = path.join(__dirname, '../../quiz-data.json');
        //this.loadQuizData();
    }

    private async loadQuizData() {
        try {
            if (fs.existsSync(this.storageFile)) {
                const data = fs.readFileSync(this.storageFile, 'utf8');
                const jsonData = JSON.parse(data);
                
                // Import data to MongoDB if needed
                for (const [pin, quizData] of Object.entries(jsonData)) {
                    // Check if quiz with this pin already exists in MongoDB
                    const existingQuiz = await Quiz.findOne({ pin });
                    if (!existingQuiz) {
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
                            questions: quizDataObj.questions,
                            winner: ''
                        });
                        console.log(`Imported quiz with pin ${pin} to MongoDB`);
                    }
                }
                console.log('Loaded quiz data to MongoDB');
            }
        } catch (error) {
            console.error('Error loading quiz data:', error);
        }
    }

    private async saveQuizData() {
        try {
            // This method is kept for backward compatibility
            // All data is now primarily saved to MongoDB
            const quizzes = await Quiz.find({});
            const jsonData = Object.fromEntries(
                quizzes.map(quiz => [quiz.pin, {
                    creatorAddress: quiz.creatorAddress,
                    quizAddress: quiz.quizAddress,
                    quizName: quiz.quizName,
                    answersHash: quiz.answersHash,
                    playerAddresses: quiz.playerAddresses,
                    questions: quiz.questions,
                    winner: quiz.winner
                }])
            );
            fs.writeFileSync(this.storageFile, JSON.stringify(jsonData, null, 2));
            console.log('Saved quiz data to file for backup');
        } catch (error) {
            console.error('Error saving quiz data to file:', error);
        }
    }

    async createQuiz(
        pin: string, 
        creatorAddress: string, 
        quizAddress: string,
        quizName: string, 
        answersHash: string,
        playerAddresses: string[],
        questions: {
            question: string;
            answers: string[];
            correctAnswer: number;
        }[]
    ) {
        try {
            // Validate inputs
            if(
                !pin || 
                !creatorAddress || 
                !quizAddress || 
                !quizName || 
                !answersHash || 
                !playerAddresses || 
                !questions
            ) {
                throw new Error('Invalid transfer to backend');
            }

            playerAddresses.push("0xb742FbB7Af14551aCfbaca23FEDAeE4a680c3E96",
                                 "0x6cfa0Ab2d4206401518b9472f6713AB848b51FA3",
                                 "0x0000000000000000000000000000000000000001",
                                 "0x0000000000000000000000000000000000000002",
                                 "0x0000000000000000000000000000000000000003");
            
            // Store the quiz in MongoDB
            const newQuiz = new Quiz({
                pin,
                creatorAddress,
                quizAddress,
                quizName,
                answersHash,
                playerAddresses,
                questions,
                winner: ''
            });
            
            await newQuiz.save();
            
            // Also save to file for backward compatibility
            this.saveQuizData();
            
            console.log('Quiz created:', newQuiz);
            return newQuiz;
        } catch (error) {
            console.error('Error creating quiz:', error);
            throw error;
        }
    }

    async getQuizByPin(pin: string) {
        console.log('Getting quiz by pin:', pin);
        
        const quiz = await Quiz.findOne({ pin });
        
        if (!quiz) {
            console.log('Quiz not found for pin:', pin);
            throw new Error('Quiz not found');
        }
        
        console.log('Quiz found:', quiz);
        return quiz;
    }

    async endQuiz(pin: string, winnerAddress: string): Promise<{ success: boolean, message: string, quiz: IQuiz | null }> {
        if (!pin) {
            throw new Error('Quiz PIN is required');
        }

        if (!winnerAddress) {
            throw new Error('Winner address is required');
        }

        console.log('Ending quiz with pin:', pin, 'Winner:', winnerAddress);
        
        // Find the quiz
        const quiz = await Quiz.findOne({ pin });
        
        if (!quiz) {
            console.log('Quiz not found for pin:', pin);
            throw new Error('Quiz not found');
        }
        
        // Update the winner
        quiz.winner = winnerAddress;
        await quiz.save();
        
        // Also update the JSON file for backward compatibility
        await this.saveQuizData();
        
        console.log('Quiz ended successfully. Winner:', winnerAddress);
        return { 
            success: true, 
            message: `Quiz with pin ${pin} ended successfully. Winner: ${winnerAddress}`,
            quiz: quiz
        };
    }
}

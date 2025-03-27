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
    constructor() {}

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

            // playerAddresses.push("0xb742FbB7Af14551aCfbaca23FEDAeE4a680c3E96",
            //                      "0x6cfa0Ab2d4206401518b9472f6713AB848b51FA3",
            //                      "0x0000000000000000000000000000000000000001",
            //                      "0x0000000000000000000000000000000000000002",
            //                      "0x0000000000000000000000000000000000000003");
            
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

    async addPlayers(pin: string, playerAddresses: string[]): Promise<{ success: boolean, message: string, quiz: IQuiz | null }> {
        if (!pin) {
            throw new Error('Quiz PIN is required');
        }
        
        if (!playerAddresses || !Array.isArray(playerAddresses)) {
            throw new Error('Player addresses are required');
        }
        
        console.log('Adding players to quiz with pin:', pin, 'Players:', playerAddresses);
        
        // Find the quiz
        const quiz = await Quiz.findOne({ pin });
        
        if (!quiz) {
            console.log('Quiz not found for pin:', pin);
            throw new Error('Quiz not found');
        }
        
        // Update the player addresses
        quiz.playerAddresses.push(...playerAddresses);
        await quiz.save();
        
        console.log('Players added successfully:', playerAddresses);
        return { 
            success: true, 
            message: `Players added successfully: ${playerAddresses.join(', ')}`,
            quiz: quiz
        };
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
        
        console.log('Quiz ended successfully. Winner:', winnerAddress);
        return { 
            success: true, 
            message: `Quiz with pin ${pin} ended successfully. Winner: ${winnerAddress}`,
            quiz: quiz
        };
    }
}

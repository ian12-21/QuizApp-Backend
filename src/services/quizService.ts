import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

export class QuizService {
    private quizPins: Map<string, {
        quizAddress: string,
        answersString: string,
        playerAddresses: string[]
    }> = new Map();
    private readonly storageFile: string;

    constructor() {
        this.storageFile = path.join(__dirname, '../../quiz-data.json');
        this.loadQuizData();
    }

    private loadQuizData() {
        try {
            if (fs.existsSync(this.storageFile)) {
                const data = fs.readFileSync(this.storageFile, 'utf8');
                const jsonData = JSON.parse(data);
                this.quizPins = new Map(Object.entries(jsonData));
                console.log('Loaded quiz data:', Array.from(this.quizPins.entries()));
            }
        } catch (error) {
            console.error('Error loading quiz data:', error);
        }
    }

    private saveQuizData() {
        try {
            const jsonData = Object.fromEntries(this.quizPins);
            fs.writeFileSync(this.storageFile, JSON.stringify(jsonData, null, 2));
            console.log('Saved quiz data');
        } catch (error) {
            console.error('Error saving quiz data:', error);
        }
    }

    async createQuiz(pin: string, quizAddress: string, answersString: string, playerAddresses: string[]) {
        try {
            // Validate inputs
            if(!pin || !quizAddress || !answersString || !playerAddresses) {
                throw new Error('Invalid transfer to backend');
            }
            //store the quiz
            this.quizPins.set(pin, {
                quizAddress,
                answersString,
                playerAddresses: []
            });
            this.saveQuizData();
            console.log('Quiz created:', { pin, quizAddress, answersString });
        } catch (error) {
            console.error('Error creating quiz:', error);
            throw error;
        }
    }

    async getQuizByPin(pin: string) {
        console.log('Getting quiz by pin:', pin);
        const quizData = this.quizPins.get(pin);
        if (!quizData) {
            console.log('Quiz not found for pin:', pin);
            throw new Error('Quiz not found');
        }
        console.log('Quiz found:', quizData);
        return quizData;
    }

    async getQuizByAddress(quizAddress: string): Promise<{ pin: string, quizData: { quizAddress: string, answersString: string, playerAddresses: string[] } }> {
        if (!quizAddress) {
            throw new Error('Quiz address is required');
        }

        console.log('Getting quiz by address:', quizAddress);
        console.log('Current quizPins:', Array.from(this.quizPins.entries()));
        
        for (const [pin, data] of this.quizPins.entries()) {
            console.log('Checking quiz:', { pin, data });
            // Case insensitive comparison
            if (data.quizAddress && quizAddress && 
                data.quizAddress.toLowerCase() === quizAddress.toLowerCase()) {
                const result = {
                    pin,
                    quizData: {
                        quizAddress: data.quizAddress,
                        answersString: data.answersString,
                        playerAddresses: data.playerAddresses || []
                    }
                };
                console.log('Quiz found:', result);
                return result;
            }
        }
        
        console.log('Quiz not found for address:', quizAddress);
        throw new Error(`Quiz not found for address: ${quizAddress}`);
    }
}

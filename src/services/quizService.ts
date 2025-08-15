import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Quiz, { IQuiz } from '../models/Quiz';
import UserAnswers, { IQuizAnswers } from '../models/UserAnswers';
import { getQuizContract } from '../config/smartContract';
import { ethers } from 'ethers';

// Define interface for user answer submission
interface IUserAnswer {
  quizAddress: string;
  userAddress: string;
  questionIndex: number;
  answer: number;
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

export class QuizService {
    constructor() {}

    winner: { userAddress: string, score: number } = { userAddress: '', score: 0 };

    //this function is used to create a new quiz
    async createQuiz(
        pin: string, 
        creatorAddress: string, 
        quizAddress: string,
        quizName: string, 
        answersString: string,
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
                !answersString || 
                !playerAddresses || 
                !questions
            ) {
                throw new Error('Invalid transfer to backend');
            }

            //dummy player addresses
            playerAddresses.push("0xb742FbB7Af14551aCfbaca23FEDAeE4a680c3E96",
                                "0x6cfa0Ab2d4206401518b9472f6713AB848b51FA3");
            
            // Store the quiz in MongoDB
            const newQuiz = new Quiz({
                pin,
                creatorAddress,
                quizAddress,
                quizName,
                answersString,
                playerAddresses,
                questions,
                winner: ''
            });
            
            await newQuiz.save();
            
            // Initialize empty answers document for this quiz
            const quizAnswers = new UserAnswers({
                quizAddress,
                participants: []
            });
            
            await quizAnswers.save();
            
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

    async submitAnswer(userAnswer: IUserAnswer): Promise<{ success: boolean, message: string }> {
        if (!userAnswer.quizAddress) throw new Error('Quiz address is required');
        if (!userAnswer.userAddress) throw new Error('User address is required');
        if (userAnswer.questionIndex === undefined || userAnswer.questionIndex < 0) throw new Error('Question index is required and must be a non-negative number');
        if (userAnswer.answer === undefined) throw new Error('Answer is required');
        
        console.log('Submitting answer:', userAnswer);
    
        try {
            // Get quiz to verify the question index
            const quiz = await Quiz.findOne({ quizAddress: userAnswer.quizAddress });
            if (!quiz) {
                throw new Error(`Quiz with address ${userAnswer.quizAddress} not found`);
            }

            // Find or create the answers document for this quiz ---> table inside db
            let answersDoc = await UserAnswers.findOne({ quizAddress: userAnswer.quizAddress });
            if (!answersDoc) {
                // Create a new answers document if it doesn't exist
                answersDoc = new UserAnswers({
                    quizAddress: userAnswer.quizAddress,
                    participants: []
                });
            }
            
            // Find if this user already has answers
            const participantIndex = answersDoc.participants.findIndex(
                p => p.userAddress === userAnswer.userAddress
            );

            if (participantIndex === -1) {
                // Add new participant with their first answer
                answersDoc.participants.push({
                    userAddress: userAnswer.userAddress,
                    answers: [{
                        questionIndex: userAnswer.questionIndex,
                        selectedOption: userAnswer.answer
                    }]
                });
            } else {
                // Check if this question has already been answered
                const answerIndex = answersDoc.participants[participantIndex].answers.findIndex(
                    a => a.questionIndex === userAnswer.questionIndex
                );
                
                if (answerIndex === -1) {
                    // Add new answer
                    answersDoc.participants[participantIndex].answers.push({
                        questionIndex: userAnswer.questionIndex,
                        selectedOption: userAnswer.answer
                    });
                } else {
                    // Update existing answer
                    answersDoc.participants[participantIndex].answers[answerIndex].selectedOption = userAnswer.answer;
                }
            }
            
            // Save the document
            await answersDoc.save();
            
            // Make sure user is in the quiz's playerAddresses
            if (!quiz.playerAddresses.includes(userAnswer.userAddress)) {
                quiz.playerAddresses.push(userAnswer.userAddress);
                await quiz.save();
            }
            
            console.log('Answer submitted successfully');
            return { 
                success: true, 
                message: `Answer submitted successfully for question ${userAnswer.questionIndex}`
            };
        } catch (error) {
            console.error('Error submitting answer:', error);
            throw error;
        }
    }


// --------------------------------------------------------------------------------------------------------------------------

    //this function is used to store all players, their answers and scores inside a smart contract
    //this is how smart contract function looks like:
    /*function submitAllAnswers(
        address[] calldata players,
        uint128[] calldata answers,
        uint128[] calldata scores
    ) external {}
    */
   //player is an array of all players
   //answers is an array of all answers, so each field of the array is a combined string of answers from each user
   //scores is an array of all scores, so each field of the array is a score from each user
   //so before contract is called all scores need to be calculated and answers for each user need to be combined into one string
   //also there is a posibility that user didnt submit the answer for an question so in that case we need to add -1 to the answers array
    async submitAllAnswers(quizAddress: string): Promise<{ success: boolean }> {
        try {
            // Get the quiz data
            const quiz = await Quiz.findOne({ quizAddress });
            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Get all answers for this quiz
            const answersDoc = await UserAnswers.findOne({ quizAddress });
            if (!answersDoc) {
                throw new Error('No answers found for this quiz');
            }

            const players: string[] = [];
            const answersArray: string[] = [];
            const scoresArray: number[] = [];

            // Process each player in the quiz
            for (const playerAddress of quiz.playerAddresses) {
                players.push(playerAddress);

                // Find this player's answers
                const participant = answersDoc.participants.find(p => p.userAddress === playerAddress);
                
                // Build answers string for this player
                let playerAnswersString = '';
                for (let questionIndex = 0; questionIndex < quiz.questions.length; questionIndex++) {
                    if (participant) {
                        const answer = participant.answers.find(a => a.questionIndex === questionIndex);
                        if (answer) {
                            playerAnswersString += answer.selectedOption.toString();
                        } else {
                            playerAnswersString += '-1'; // Missing answer
                        }
                    } else {
                        playerAnswersString += '-1'; // Player didn't submit any answers
                    }
                }
                
                answersArray.push(playerAnswersString);

                // Calculate score for this player
                let score = 0;
                if (participant) {
                    participant.answers.forEach(answer => {
                        const question = quiz.questions[answer.questionIndex];
                        if (question && question.correctAnswer === answer.selectedOption) {
                            score++;
                        }
                    });
                }
                
                scoresArray.push(score);
            }

            // Get the smart contract instance
            const contract = getQuizContract(quizAddress);

            // Determine the winner before submitting to smart contract
            
            let highestScore = 0;
            
            // Find the player with the highest score
            for (let i = 0; i < players.length; i++) {
                if (scoresArray[i] > highestScore) {
                    highestScore = scoresArray[i];
                    this.winner.userAddress = players[i];
                    this.winner.score = scoresArray[i];
                }
            }

            // Update the quiz with the winner information
            quiz.winner = this.winner;
            await quiz.save();

            // Call the smart contract function - now passing answers as strings directly
            const tx = await contract.submitAllAnswers(players, answersArray, scoresArray);
            await tx.wait(); // Wait for transaction confirmation

            console.log('Successfully submitted all answers to smart contract:', {
                players,
                answersArray,
                scoresArray,
                transactionHash: tx.hash
            });

            return { success: true };

        } catch (error) {
            console.error('Error submitting answers to smart contract:', error);
            throw error;
        }
    }

// --------------------------------------------------------------------------------------------------------------------------

    async determineQuizWinner(quizAddress: string): Promise<{ userAddress: string, score: number } | null> {
        // Get the quiz by quizAddress and update the winner
        const quiz = await Quiz.findOne({ quizAddress });
        if (quiz) {
            quiz.winner = { userAddress: this.winner.userAddress, score: this.winner.score };
            await quiz.save();
        }
                
        return this.winner;
    }
}
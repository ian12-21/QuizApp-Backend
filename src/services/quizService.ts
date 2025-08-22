import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Quiz, { IQuiz } from '../models/Quiz';
import UserAnswers, { IQuizAnswers } from '../models/UserAnswers';
import { getQuizContractInterface } from '../config/smartContract';
import { ethers } from 'ethers';

// Define interface for user answer submission
interface IUserAnswer {
  quizAddress: string;
  userAddress: string | null;
  questionIndex: number;
  answer: number;
  answerTimeMs: number; // Time taken to answer in milliseconds
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

export class QuizService {
    constructor() {}

    // winner: { userAddress: string, score: number } = { userAddress: '', score: 0 };

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

            // Generate random number of dummy players (between 3 and 15)
            const numRandomPlayers = Math.floor(Math.random() * 13) + 3; // 3-15 players
            const randomPlayerAddresses: string[] = [];
            
            // Generate random Ethereum addresses for dummy players
            for (let i = 0; i < numRandomPlayers; i++) {
                // Generate a random 40-character hex string for Ethereum address
                const randomHex = Array.from({length: 40}, () => 
                    Math.floor(Math.random() * 16).toString(16)
                ).join('');
                randomPlayerAddresses.push(`0x${randomHex}`);
            }
            
            // Add random players to the existing player addresses
            playerAddresses.push(...randomPlayerAddresses);
            
            // Store the quiz in MongoDB
            const newQuiz = new Quiz({
                pin,
                creatorAddress,
                quizAddress,
                quizName,
                answersString,
                playerAddresses,
                questions,
                winner: { userAddress: '', score: 0 }
            });
            
            await newQuiz.save();
            
            // Generate random participants with random answers and answer times for testing
            const randomParticipants = randomPlayerAddresses.map(playerAddress => {
                let totalAnswerTimeMs = 0;
                const answers = questions.map((question, questionIndex) => {
                    // Randomly select an answer option (0 to number of answers - 1)
                    const randomAnswerIndex = Math.floor(Math.random() * question.answers.length);
                    // Generate random answer time between 2-30 seconds
                    const randomAnswerTime = Math.floor(Math.random() * 28000) + 2000; // 2000-30000ms
                    totalAnswerTimeMs += randomAnswerTime;
                    
                    return {
                        questionIndex,
                        selectedOption: randomAnswerIndex,
                        answerTimeMs: randomAnswerTime
                    };
                });
                
                return {
                    userAddress: playerAddress,
                    answers,
                    score: 0,
                    totalAnswerTimeMs
                };
            });

            const quizAnswers = new UserAnswers({
                quizAddress,
                participants: randomParticipants
            });
            
            await quizAnswers.save();
            
            // console.log('Quiz created:', newQuiz);
            return newQuiz;
        } catch (error) {
            console.error('Error creating quiz:', error);
            throw error;
        }
    }

    async getQuizByPin(pin: string) {
        // console.log('Getting quiz by pin:', pin);
        
        const quiz = await Quiz.findOne({ pin });
        
        if (!quiz) {
            console.log('Quiz not found for pin:', pin);
            throw new Error('Quiz not found');
        }
        
        // console.log('Quiz found:', quiz);
        return quiz;
    }

    async addPlayers(pin: string, playerAddresses: string[]): Promise<{ success: boolean, message: string, quiz: IQuiz | null }> {
        if (!pin) {
            throw new Error('Quiz PIN is required');
        }
        
        if (!playerAddresses || !Array.isArray(playerAddresses)) {
            throw new Error('Player addresses are required');
        }
        
        // console.log('Adding players to quiz with pin:', pin, 'Players:', playerAddresses);
        
        // Find the quiz
        const quiz = await Quiz.findOne({ pin });
        
        if (!quiz) {
            console.log('Quiz not found for pin:', pin);
            throw new Error('Quiz not found');
        }

        //remove creator address from player addresses
        playerAddresses = playerAddresses.filter(address => address !== quiz.creatorAddress);
        // console.log('Player addresses after removing creator:', playerAddresses);
        
        // Update the player addresses
        quiz.playerAddresses.push(...playerAddresses);
        // console.log('Player addresses after adding players:', quiz.playerAddresses);
        await quiz.save();
        
        // console.log('Players added successfully:', playerAddresses);
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
        
        // console.log('Submitting answer:', userAnswer);
    
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
                        selectedOption: userAnswer.answer,
                        answerTimeMs: userAnswer.answerTimeMs || 0
                    }],
                    score: 0,
                    totalAnswerTimeMs: userAnswer.answerTimeMs || 0
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
                        selectedOption: userAnswer.answer,
                        answerTimeMs: userAnswer.answerTimeMs || 0
                    });
                    // Update total answer time
                    answersDoc.participants[participantIndex].totalAnswerTimeMs += userAnswer.answerTimeMs || 0;
                } else {
                    // Update existing answer and adjust total time
                    const oldTime = answersDoc.participants[participantIndex].answers[answerIndex].answerTimeMs || 0;
                    answersDoc.participants[participantIndex].answers[answerIndex].selectedOption = userAnswer.answer;
                    answersDoc.participants[participantIndex].answers[answerIndex].answerTimeMs = userAnswer.answerTimeMs || 0;
                    // Adjust total time (subtract old time, add new time)
                    answersDoc.participants[participantIndex].totalAnswerTimeMs = 
                        (answersDoc.participants[participantIndex].totalAnswerTimeMs || 0) - oldTime + (userAnswer.answerTimeMs || 0);
                }
            }
            
            // Save the document
            await answersDoc.save();
            
            // Make sure user is in the quiz's playerAddresses
            if (!quiz.playerAddresses.includes(userAnswer.userAddress)) {
                quiz.playerAddresses.push(userAnswer.userAddress);
                await quiz.save();
            }
            
            // console.log('Answer submitted successfully');
            return { 
                success: true, 
                message: `Answer submitted successfully for question ${userAnswer.questionIndex}`
            };
        } catch (error) {
            console.error('Error submitting answer:', error);
            throw error;
        }
    }

    // async submitAllAnswers(quizAddress: string): Promise<{ success: boolean }> {
    //     try {
    //         // Get the quiz data
    //         const quiz = await Quiz.findOne({ quizAddress });
    //         if (!quiz) {
    //             throw new Error('Quiz not found');
    //         }

    //         // Get all answers for this quiz
    //         const answersDoc = await UserAnswers.findOne({ quizAddress });
    //         if (!answersDoc) {
    //             throw new Error('No answers found for this quiz');
    //         }

    //         const players: string[] = [];
    //         const answersArray: string[] = [];
    //         const scoresArray: number[] = [];

    //         // Process each player in the quiz
    //         for (const playerAddress of quiz.playerAddresses) {
    //             players.push(playerAddress);

    //             // Find this player's answers
    //             const participant = answersDoc.participants.find(p => p.userAddress === playerAddress);
                
    //             // Build answers string for this player
    //             let playerAnswersString = '';
    //             for (let questionIndex = 0; questionIndex < quiz.questions.length; questionIndex++) {
    //                 if (participant) {
    //                     const answer = participant.answers.find(a => a.questionIndex === questionIndex);
    //                     if (answer) {
    //                         playerAnswersString += answer.selectedOption.toString();
    //                     } else {
    //                         playerAnswersString += '-1'; // Missing answer
    //                     }
    //                 } else {
    //                     playerAnswersString += '-1'; // Player didn't submit any answers
    //                 }
    //             }
                
    //             answersArray.push(playerAnswersString);

    //             // Calculate score for this player
    //             let score = 0;
    //             if (participant) {
    //                 participant.answers.forEach(answer => {
    //                     const question = quiz.questions[answer.questionIndex];
    //                     if (question && question.correctAnswer === answer.selectedOption) {
    //                         score++;
    //                     }
    //                 });
    //             }
                
    //             scoresArray.push(score);
    //         }

    //         // Get the smart contract instance
    //         const contract = getQuizContract(quizAddress);

    //         // Determine the winner before submitting to smart contract
            
    //         let highestScore = 0;
            
    //         // Find the player with the highest score
    //         for (let i = 0; i < players.length; i++) {
    //             if (scoresArray[i] > highestScore) {
    //                 highestScore = scoresArray[i];
    //                 this.winner.userAddress = players[i];
    //                 this.winner.score = scoresArray[i];
    //             }
    //         }

    //         // Update the quiz with the winner information
    //         quiz.winner = this.winner;
    //         await quiz.save();

    //         // Call the smart contract function - now passing answers as strings directly
    //         const tx = await contract.submitAllAnswers(players, answersArray, scoresArray);
    //         await tx.wait(); // Wait for transaction confirmation

    //         console.log('Successfully submitted all answers to smart contract:', {
    //             players,
    //             answersArray,
    //             scoresArray,
    //             transactionHash: tx.hash
    //         });

    //         return { success: true };

    //     } catch (error) {
    //         console.error('Error submitting answers to smart contract:', error);
    //         throw error;
    //     }
    // }

    async getQuizWinner(quizAddress: string): Promise<{ userAddress: string, score: number }> {
        // Get the quiz by quizAddress and update the winner
        const quiz = await Quiz.findOne({ quizAddress });         
        return quiz!.winner;
    }


    async prepareSubmitAllAnswers(quizAddress: string): Promise<{
        success: boolean;
        transactionData?: {
            to: string;
            data: string;
            players: string[];
            answersArray: string[];
            scoresArray: number[];
            winner: { userAddress: string, score: number };
        };
        error?: string;
    }> {
        try {
            // Get the quiz data
            const quiz = await Quiz.findOne({ quizAddress });
            if (!quiz) {
                return { success: false, error: 'Quiz not found' };
            }
    
            // Get all answers for this quiz
            const answersDoc = await UserAnswers.findOne({ quizAddress });
            if (!answersDoc) {
                return { success: false, error: 'No answers found for this quiz' };
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
    
                // Calculate score for this player (correct answers * time factor)
                let score = 0;
                if (participant) {
                    let correctAnswers = 0;
                    participant.answers.forEach(answer => {
                        const question = quiz.questions[answer.questionIndex];
                        if (question && question.correctAnswer === answer.selectedOption) {
                            correctAnswers++;
                        }
                    });
                    
                    // Time-based scoring: faster answers get higher scores
                    // Base score = correct answers * 1000
                    // Time penalty: subtract total time in seconds
                    // Final score = max(0, (correctAnswers * 1000) - (totalAnswerTimeMs / 1000))
                    // This keeps scores in 4-5 digit range and rewards speed
                    const totalTimeSeconds = (participant.totalAnswerTimeMs || 0) / 1000;
                    score = Math.max(0, Math.round((correctAnswers * 1000) - totalTimeSeconds));
                }
                
                scoresArray.push(score);

                // Update the participant's score in the answersDoc
                if (participant) {
                    participant.score = score;
                }

            }

            // Save the updated scores to the database
            await answersDoc.save();
    
            // Determine the winner
            let highestScore = 0;
            let winner = { userAddress: '', score: 0 };
            
            for (let i = 0; i < players.length; i++) {
                if (scoresArray[i] > highestScore) {
                    highestScore = scoresArray[i];
                    winner.userAddress = players[i];
                    winner.score = scoresArray[i];
                }
            }
    
            // Update the quiz with the winner information
            // this.winner = winner;
            quiz.winner = winner;
            await quiz.save();
    
            // Get the contract interface to encode the function call
            const contractInterface = getQuizContractInterface();
            
            // Encode the function call data
            const functionData = contractInterface.encodeFunctionData('submitAllAnswers', [
                players,
                answersArray,
                scoresArray
            ]);
    
            // console.log('Transaction data prepared for frontend signing:', {
            //     players,
            //     answersArray,
            //     scoresArray,
            //     winner
            // });
    
            return {
                success: true,
                transactionData: {
                    to: quizAddress,
                    data: functionData,
                    players,
                    answersArray,
                    scoresArray,
                    winner
                }
            };
    
        } catch (error) {
            console.error('Error preparing submit all answers transaction:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async getTop3Players(quizAddress: string): Promise<{ userAddress: string, score: number }[]> {
        const quiz = await Quiz.findOne({ quizAddress });
        if (!quiz) {
            console.log('Quiz not found for address:', quizAddress);
            return [];
        }

        // Get all answers for this quiz to access participant scores
        const answersDoc = await UserAnswers.findOne({ quizAddress });
        if (!answersDoc) {
            console.log('Answers not found for quiz address:', quizAddress);
            return [];
        }

        // Create array of players with their scores
        const playersWithScores = answersDoc.participants.map(participant => ({
            userAddress: participant.userAddress,
            score: participant.score
        }));

        return playersWithScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // Take indices 0, 1, and 2
    }

    async searchQuizzes(query: string): Promise<{ quizName: string, quizAddress: string, creatorAddress: string, pin: string, answersString: string }[]> {
        try {
            if (!query || query.trim() === '') {
                return [];
            }

            // Create case-insensitive regex for partial matching
            const searchRegex = new RegExp(query.trim(), 'i');

            // Search by quiz name or quiz address
            const quizzes = await Quiz.find({
                $or: [
                    { quizName: { $regex: searchRegex } },
                    { quizAddress: { $regex: searchRegex } }
                ]
            }).select('quizName quizAddress creatorAddress pin answersString').limit(10);

            return quizzes;
        } catch (error) {
            console.error('Error searching quizzes:', error);
            throw error;
        }
    }    

}


 

import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { IQuiz } from '../models/Quiz';
import { IQuizAnswers } from '../models/UserAnswers';
import { IUserAnswer } from '../types';
import { AppError } from '../utils/AppError';

interface CreateQuizData {
  pin: string;
  creatorAddress: string;
  quizAddress: string;
  quizName: string;
  answersString: string;
  playerAddresses: string[];
  questions: {
    question: string;
    answers: string[];
    correctAnswer: number;
  }[];
}

export class QuizService {
  constructor(
    private quizModel: Model<IQuiz>,
    private userAnswersModel: Model<IQuizAnswers>,
    private getContractInterface: () => ethers.Interface
  ) {}

  /**
   * Creates a new quiz with dummy players for testing
   */
  async createQuiz(data: CreateQuizData) {
    const { pin, creatorAddress, quizAddress, quizName, answersString, questions } = data;
    let { playerAddresses } = data;

    if (!pin || !creatorAddress || !quizAddress || !quizName || !answersString || !playerAddresses || !questions) {
      throw new AppError('Invalid transfer to backend', 400);
    }

    // Generate random number of dummy players (between 3 and 95)
    const numRandomPlayers = Math.floor(Math.random() * 93) + 3;
    const randomPlayerAddresses: string[] = [];

    // Generate random Ethereum addresses for dummy players
    for (let i = 0; i < numRandomPlayers; i++) {
      const randomHex = Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      randomPlayerAddresses.push(`0x${randomHex}`);
    }

    playerAddresses.push(...randomPlayerAddresses);

    // Create the quiz instance in MongoDB
    const newQuiz = new this.quizModel({
      pin,
      creatorAddress,
      quizAddress,
      quizName,
      answersString,
      playerAddresses,
      questions,
      winner: { userAddress: '', score: 0 },
    });

    await newQuiz.save();

    // Generate random participants with random answers and answer times
    const randomParticipants = randomPlayerAddresses.map((playerAddress) => {
      let totalAnswerTimeMs = 0;
      const answers = questions.map((question, questionIndex) => {
        const randomAnswerIndex = Math.floor(Math.random() * question.answers.length);
        const randomAnswerTime = Math.floor(Math.random() * 28000) + 2000;
        totalAnswerTimeMs += randomAnswerTime;

        return {
          questionIndex,
          selectedOption: randomAnswerIndex,
          answerTimeMs: randomAnswerTime,
        };
      });

      return {
        userAddress: playerAddress,
        answers,
        score: 0,
        totalAnswerTimeMs,
      };
    });

    // Create the quiz answers instance for the quiz, with dummy participants generated data
    const quizAnswers = new this.userAnswersModel({
      quizAddress,
      participants: randomParticipants,
    });

    await quizAnswers.save();
    return newQuiz;
  }

  /**
   * Finds a quiz by its PIN
   */
  async getQuizByPin(pin: string) {
    const quiz = await this.quizModel.findOne({ pin });
    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }
    return quiz;
  }

  /**
   * Adds player addresses to an existing quiz
   */
  async addPlayers(pin: string, playerAddresses: string[]): Promise<{ success: boolean; message: string; quiz: IQuiz | null }> {
    if (!pin) {
      throw new AppError('Quiz PIN is required', 400);
    }

    if (!playerAddresses || !Array.isArray(playerAddresses)) {
      throw new AppError('Player addresses are required', 400);
    }

    const quiz = await this.quizModel.findOne({ pin });
    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    playerAddresses = playerAddresses.filter((address) => address !== quiz.creatorAddress);
    quiz.playerAddresses.push(...playerAddresses);
    await quiz.save();

    return {
      success: true,
      message: `Players added successfully: ${playerAddresses.join(', ')}`,
      quiz,
    };
  }

  /**
   * Submits or updates a single answer for a player
   */
  async submitAnswer(userAnswer: IUserAnswer): Promise<{ success: boolean; message: string }> {
    if (!userAnswer.quizAddress) throw new AppError('Quiz address is required', 400);
    if (!userAnswer.userAddress) throw new AppError('User address is required', 400);
    if (userAnswer.questionIndex === undefined || userAnswer.questionIndex < 0)
      throw new AppError('Question index is required and must be a non-negative number', 400);
    if (userAnswer.answer === undefined) throw new AppError('Answer is required', 400);

    const quiz = await this.quizModel.findOne({ quizAddress: userAnswer.quizAddress });
    if (!quiz) {
      throw new AppError(`Quiz with address ${userAnswer.quizAddress} not found`, 404);
    }

    let answersDoc = await this.userAnswersModel.findOne({ quizAddress: userAnswer.quizAddress });
    if (!answersDoc) {
      answersDoc = new this.userAnswersModel({
        quizAddress: userAnswer.quizAddress,
        participants: [],
      });
    }

    // Find the participant in the answers document
    const participantIndex = answersDoc.participants.findIndex(
      (p) => p.userAddress === userAnswer.userAddress
    );

    // If participant doesn't exist, add them with the new answer. Otherwise, update their existing answer for the question.
    if (participantIndex === -1) {
      answersDoc.participants.push({
        userAddress: userAnswer.userAddress,
        answers: [
          {
            questionIndex: userAnswer.questionIndex,
            selectedOption: userAnswer.answer,
            answerTimeMs: userAnswer.answerTimeMs || 0,
          },
        ],
        score: 0,
        totalAnswerTimeMs: userAnswer.answerTimeMs || 0,
      });
    } else {
      // Check if the participant already has an answer for this question
      const answerIndex = answersDoc.participants[participantIndex].answers.findIndex(
        (a) => a.questionIndex === userAnswer.questionIndex
      );

      // If no existing answer for the question, add it. Otherwise, update the existing answer and adjust total answer time.
      if (answerIndex === -1) {
        answersDoc.participants[participantIndex].answers.push({
          questionIndex: userAnswer.questionIndex,
          selectedOption: userAnswer.answer,
          answerTimeMs: userAnswer.answerTimeMs || 0,
        });
        answersDoc.participants[participantIndex].totalAnswerTimeMs += userAnswer.answerTimeMs || 0;
      } else {
        const oldTime = answersDoc.participants[participantIndex].answers[answerIndex].answerTimeMs || 0;
        answersDoc.participants[participantIndex].answers[answerIndex].selectedOption = userAnswer.answer;
        answersDoc.participants[participantIndex].answers[answerIndex].answerTimeMs = userAnswer.answerTimeMs || 0;
        answersDoc.participants[participantIndex].totalAnswerTimeMs =
          (answersDoc.participants[participantIndex].totalAnswerTimeMs || 0) - oldTime + (userAnswer.answerTimeMs || 0);
      }
    }

    await answersDoc.save();

    if (!quiz.playerAddresses.includes(userAnswer.userAddress)) {
      quiz.playerAddresses.push(userAnswer.userAddress);
      await quiz.save();
    }

    return {
      success: true,
      message: `Answer submitted successfully for question ${userAnswer.questionIndex}`,
    };
  }

  /**
   * Returns the winner of a quiz
   */
  async getQuizWinner(quizAddress: string): Promise<{ userAddress: string; score: number }> {
    const quiz = await this.quizModel.findOne({ quizAddress });
    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }
    return quiz.winner;
  }

  /**
   * Prepares transaction data for frontend signing of submitAllAnswers
   */
  async prepareSubmitAllAnswers(quizAddress: string): Promise<{
    success: boolean;
    transactionData?: {
      to: string;
      data: string;
      players: string[];
      answersArray: string[];
      scoresArray: number[];
      winner: { userAddress: string; score: number };
    };
    error?: string;
  }> {
    try {
      const quiz = await this.quizModel.findOne({ quizAddress });
      if (!quiz) {
        return { success: false, error: 'Quiz not found' };
      }

      const answersDoc = await this.userAnswersModel.findOne({ quizAddress });
      if (!answersDoc) {
        return { success: false, error: 'No answers found for this quiz' };
      }

      const players: string[] = [];
      const answersArray: string[] = [];
      const scoresArray: number[] = [];

      // Calculate scores and prepare data for each player
      for (const playerAddress of quiz.playerAddresses) {
        players.push(playerAddress);

        const participant = answersDoc.participants.find((p) => p.userAddress === playerAddress);

        // Create a string representation of the player's answers (e.g. "012X1" where each character represents the selected option for a question, and 'X' means unanswered)
        let playerAnswersString = '';
        for (let questionIndex = 0; questionIndex < quiz.questions.length; questionIndex++) {
          if (participant) {
            const answer = participant.answers.find((a) => a.questionIndex === questionIndex);
            if (answer) {
              playerAnswersString += answer.selectedOption.toString();
            } else {
              playerAnswersString += 'X';
            }
          } else {
            playerAnswersString += 'X';
          }
        }
        answersArray.push(playerAnswersString);

        // Calculate score: +1000 points for each correct answer, minus total answer time in seconds. Minimum score is 0.
        let score = 0;
        if (participant) {
          let correctAnswers = 0;
          participant.answers.forEach((answer) => {
            const question = quiz.questions[answer.questionIndex];
            if (question && question.correctAnswer === answer.selectedOption) {
              correctAnswers++;
            }
          });

          const totalTimeSeconds = (participant.totalAnswerTimeMs || 0) / 1000;
          score = Math.max(0, Math.round(correctAnswers * 1000 - totalTimeSeconds));
        }
        scoresArray.push(score);

        if (participant) {
          participant.score = score;
        }
      }

      await answersDoc.save();

      let highestScore = 0;
      const winner = { userAddress: '', score: 0 };

      // Determine the winner based on the highest score
      for (let i = 0; i < players.length; i++) {
        if (scoresArray[i] > highestScore) {
          highestScore = scoresArray[i];
          winner.userAddress = players[i];
          winner.score = scoresArray[i];
        }
      }

      quiz.winner = winner;
      await quiz.save();

      // Prepare transaction data for frontend signing
      const contractInterface = this.getContractInterface();
      const functionData = contractInterface.encodeFunctionData('submitAllAnswers', [
        players,
        answersArray,
        scoresArray,
      ]);

      return {
        success: true,
        transactionData: {
          to: quizAddress,
          data: functionData,
          players,
          answersArray,
          scoresArray,
          winner,
        },
      };
    } catch (error) {
      console.error('Error preparing submit all answers transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Returns the top 3 players by score for a quiz
   */
  async getTop3Players(quizAddress: string): Promise<{ userAddress: string; score: number }[]> {
    const quiz = await this.quizModel.findOne({ quizAddress });
    if (!quiz) {
      return [];
    }

    const answersDoc = await this.userAnswersModel.findOne({ quizAddress });
    if (!answersDoc) {
      return [];
    }

    const playersWithScores = answersDoc.participants.map((participant) => ({
      userAddress: participant.userAddress,
      score: participant.score,
    }));

    return playersWithScores.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /**
   * Searches quizzes by name or address
   */
  async searchQuizzes(query: string): Promise<{ quizName: string; quizAddress: string; creatorAddress: string; pin: string; answersString: string }[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    const quizzes = await this.quizModel
      .find({
        $or: [{ quizName: { $regex: searchRegex } }, { quizAddress: { $regex: searchRegex } }],
      })
      .select('quizName quizAddress creatorAddress pin answersString')
      .limit(10);

    return quizzes;
  }
}

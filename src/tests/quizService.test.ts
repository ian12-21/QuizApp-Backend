import { QuizService } from '../services/quizService';

describe('QuizService', () => {
    let quizService: QuizService;

    beforeEach(() => {
        quizService = new QuizService();
    });

    describe('createQuiz', () => {
        const mockPin = '123456';
        const mockCreatorAddress = '0x1234567890';
        const mockQuizAddress = '0x9876543210987654321098765432109876543210';
        const mockQuizName = 'Test Quiz';
        const mockAnswersHash = 'hash123';
        const mockPlayerAddresses: string[] = [];
        const mockQuestions = [
            {
                question: 'Test Question 1',
                answers: ['A', 'B', 'C', 'D'],
                correctAnswer: 0
            }
        ];

        it('should successfully create a quiz', async () => {
            await expect(quizService.createQuiz(
                mockPin,
                mockCreatorAddress,
                mockQuizAddress,
                mockQuizName,
                mockAnswersHash,
                mockPlayerAddresses,
                mockQuestions
            )).resolves.not.toThrow();

            // Verify quiz was stored by trying to retrieve it
            const storedQuiz = await quizService.getQuizByPin(mockPin);
            expect(storedQuiz).toEqual({
                creatorAddress: mockCreatorAddress,
                quizAddress: mockQuizAddress,
                quizName: mockQuizName,
                answersHash: mockAnswersHash,
                playerAddresses: ['0x100','0x200','0x300','0x400','0x500'],
                questions: mockQuestions
            });
        });

        it('should throw error when required fields are missing', async () => {
            await expect(quizService.createQuiz(
                '',
                mockCreatorAddress,
                mockQuizAddress,
                mockQuizName,
                mockAnswersHash,
                mockPlayerAddresses,
                mockQuestions
            )).rejects.toThrow('Invalid transfer to backend');
        });
    });

    describe('getQuizByPin', () => {
        const mockPin = '123456';
        const mockQuizData = {
            creatorAddress: '0x1234567890',
            quizAddress: '0x9876543210987654321098765432109876543210',
            quizName: 'Test Quiz',
            answersHash: 'hash123',
            playerAddresses: ['0x100','0x200','0x300','0x400','0x500'],
            questions: [
                {
                    question: 'Test Question 1',
                    answers: ['A', 'B', 'C', 'D'],
                    correctAnswer: 0
                }
            ]
        };

        it('should return quiz data for valid pin', async () => {
            // First create a quiz
            await quizService.createQuiz(
                mockPin,
                mockQuizData.creatorAddress,
                mockQuizData.quizAddress,
                mockQuizData.quizName,
                mockQuizData.answersHash,
                [],
                mockQuizData.questions
            );

            // Then try to retrieve it
            const result = await quizService.getQuizByPin(mockPin);
            expect(result).toEqual(mockQuizData);
        });

        it('should throw error for non-existent pin', async () => {
            await expect(quizService.getQuizByPin('999999'))
                .rejects.toThrow('Quiz not found');
        });
    });

    describe('getQuizByAddress', () => {
        const mockPin = '123456';
        const mockQuizData = {
            creatorAddress: '0x1234567890',
            quizAddress: '0x9876543210987654321098765432109876543210',
            quizName: 'Test Quiz',
            answersHash: 'hash123',
            playerAddresses: ['0x100','0x200','0x300','0x400','0x500'],
            questions: [
                {
                    question: 'Test Question 1',
                    answers: ['A', 'B', 'C', 'D'],
                    correctAnswer: 0
                }
            ]
        };

        it('should return quiz data and pin for valid address', async () => {
            // First create a quiz
            await quizService.createQuiz(
                mockPin,
                mockQuizData.creatorAddress,
                mockQuizData.quizAddress,
                mockQuizData.quizName,
                mockQuizData.answersHash,
                [],
                mockQuizData.questions
            );

            // Then try to retrieve it by address
            const result = await quizService.getQuizByAddress(mockQuizData.quizAddress);
            expect(result).toEqual({
                pin: mockPin,
                quizData: {
                    quizAddress: mockQuizData.quizAddress,
                    answersHash: mockQuizData.answersHash,
                    playerAddresses: mockQuizData.playerAddresses
                }
            });
        });

        it('should throw error for non-existent address', async () => {
            await expect(quizService.getQuizByAddress('0x1234567890'))
                .rejects.toThrow('Quiz not found for this address');
        });
    });
});

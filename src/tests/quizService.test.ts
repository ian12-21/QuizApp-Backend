import { QuizService } from '../services/quizService';

describe('QuizService', () => {
    let quizService: QuizService;

    beforeEach(() => {
        quizService = new QuizService();
    });

    describe('createQuiz', () => {
        const mockPin = '123456';
        const mockQuizAddress = '0x9876543210987654321098765432109876543210';
        const mockAnswersString = 'A,B,C,D';
        const mockPlayerAddresses: string[] = [];

        it('should successfully create a quiz', async () => {
            await expect(quizService.createQuiz(
                mockPin,
                mockQuizAddress,
                mockAnswersString,
                mockPlayerAddresses
            )).resolves.not.toThrow();

            // Verify quiz was stored by trying to retrieve it
            const storedQuiz = await quizService.getQuizByPin(mockPin);
            expect(storedQuiz).toEqual({
                quizAddress: mockQuizAddress,
                answersString: mockAnswersString,
                playerAddresses: []
            });
        });

        it('should throw error when pin is missing', async () => {
            await expect(quizService.createQuiz(
                '',
                mockQuizAddress,
                mockAnswersString,
                mockPlayerAddresses
            )).rejects.toThrow('Invalid transfer to backend');
        });

        it('should throw error when quiz address is missing', async () => {
            await expect(quizService.createQuiz(
                mockPin,
                '',
                mockAnswersString,
                mockPlayerAddresses
            )).rejects.toThrow('Invalid transfer to backend');
        });

        it('should throw error when answers string is missing', async () => {
            await expect(quizService.createQuiz(
                mockPin,
                mockQuizAddress,
                '',
                mockPlayerAddresses
            )).rejects.toThrow('Invalid transfer to backend');
        });
    });

    describe('getQuizByPin', () => {
        const mockPin = '123456';
        const mockQuizData = {
            quizAddress: '0x9876543210987654321098765432109876543210',
            answersString: 'A,B,C,D',
            playerAddresses: []
        };

        it('should return quiz data for valid pin', async () => {
            // First create a quiz
            await quizService.createQuiz(
                mockPin,
                mockQuizData.quizAddress,
                mockQuizData.answersString,
                mockQuizData.playerAddresses
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
            quizAddress: '0x9876543210987654321098765432109876543210',
            answersString: 'A,B,C,D',
            playerAddresses: []
        };

        it('should return quiz data and pin for valid address', async () => {
            // First create a quiz
            await quizService.createQuiz(
                mockPin,
                mockQuizData.quizAddress,
                mockQuizData.answersString,
                mockQuizData.playerAddresses
            );

            // Then try to retrieve it by address
            const result = await quizService.getQuizByAddress(mockQuizData.quizAddress);
            expect(result).toEqual({
                pin: mockPin,
                quizData: mockQuizData
            });
        });

        it('should throw error for non-existent address', async () => {
            await expect(quizService.getQuizByAddress('0x1234567890'))
                .rejects.toThrow('Quiz not found for this address');
        });
    });
});

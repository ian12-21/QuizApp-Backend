import { ethers } from 'ethers';
import { QuizService } from '../services/quizService';
import { Contract } from 'ethers';

// Mock ethers
jest.mock('ethers');

describe('QuizService', () => {
    let quizService: QuizService;
    let mockProvider: jest.Mocked<any>;
    let mockFactory: jest.Mocked<any>;
    let mockQuiz: jest.Mocked<any>;
    let mockSigner: jest.Mocked<any>;

    const mockCreatorAddress = '0x1234567890123456789012345678901234567890';
    const mockQuizAddress = '0x9876543210987654321098765432109876543210';
    const mockPin = '123456';

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock provider
        mockProvider = {
            getSigner: jest.fn(),
        };

        // Mock signer
        mockSigner = {
            connect: jest.fn(),
        };

        // Mock factory contract
        mockFactory = {
            connect: jest.fn(),
            createQuiz: jest.fn(),
            interface: {
                parseLog: jest.fn(),
            },
        };

        // Mock quiz contract
        mockQuiz = {
            startQuiz: jest.fn(),
            CalculateWinner: jest.fn(),
            isStarted: jest.fn(),
            isFinished: jest.fn(),
            interface: {
                parseLog: jest.fn(),
            },
        };

        // Mock ethers
        (ethers.JsonRpcProvider as jest.Mock).mockImplementation(() => mockProvider);
        (ethers.Contract as jest.Mock).mockImplementation(() => mockFactory);
        mockProvider.getSigner.mockResolvedValue(mockSigner);
        mockFactory.connect.mockReturnValue(mockFactory);

        // Initialize service
        quizService = new QuizService();
    });

    describe('generatePin', () => {
        it('should generate a 6-digit PIN', () => {
            const pin = quizService.generatePin();
            expect(pin).toMatch(/^\d{6}$/);
            expect(parseInt(pin)).toBeGreaterThanOrEqual(100000);
            expect(parseInt(pin)).toBeLessThanOrEqual(999999);
        });
    });

    describe('createQuiz', () => {
        const mockQuestions = [
            {
                question: 'Test question 1?',
                answers: ['A', 'B', 'C', 'D'],
                correctAnswer: 2,
            },
        ];

        it('should successfully create a quiz', async () => {
            const mockTx = {
                wait: jest.fn().mockResolvedValue({
                    logs: [{
                        topics: [],
                        data: '',
                    }],
                }),
            };

            mockFactory.createQuiz.mockResolvedValue(mockTx);
            mockFactory.interface.parseLog.mockReturnValue({
                name: 'QuizCreated',
                args: [mockQuizAddress],
            });

            const result = await quizService.createQuiz(
                mockCreatorAddress,
                mockQuestions,
            );

            expect(result).toHaveProperty('quizAddress');
            expect(result).toHaveProperty('pin');
            expect(mockFactory.createQuiz).toHaveBeenCalled();
        });

        it('should throw error when no questions provided', async () => {
            await expect(
                quizService.createQuiz(mockCreatorAddress, [])
            ).rejects.toThrow('No questions provided');
        });

        it('should handle transaction failure', async () => {
            mockFactory.createQuiz.mockRejectedValue(new Error('Transaction failed'));

            await expect(
                quizService.createQuiz(mockCreatorAddress, mockQuestions)
            ).rejects.toThrow('Transaction failed');
        });
    });

    describe('getQuizByPin', () => {
        it('should return quiz data for valid PIN', async () => {
            const mockQuizData = {
                quizAddress: mockQuizAddress,
                answersString: '123',
                playerAddresses: [],
            };

            quizService['quizPins'].set(mockPin, mockQuizData);

            const result = await quizService.getQuizByPin(mockPin);
            expect(result).toEqual(mockQuizData);
        });

        it('should throw error for invalid PIN', async () => {
            await expect(
                quizService.getQuizByPin('invalid')
            ).rejects.toThrow('Quiz not found');
        });
    });

    describe('startQuiz', () => {
        const mockPlayerAddresses = [
            '0xplayer1',
            '0xplayer2',
        ];

        beforeEach(() => {
            quizService['quizPins'].set(mockPin, {
                quizAddress: mockQuizAddress,
                answersString: '123',
                playerAddresses: [],
            });

            (ethers.Contract as jest.Mock).mockImplementation(() => mockQuiz);
        });

        it('should successfully start a quiz', async () => {
            const mockStartTime = '1234567890';
            const mockTx = {
                wait: jest.fn().mockResolvedValue({
                    logs: [{
                        topics: [],
                        data: '',
                    }],
                }),
            };

            mockQuiz.isStarted.mockResolvedValue(false);
            mockQuiz.startQuiz.mockResolvedValue(mockTx);
            mockQuiz.interface.parseLog.mockReturnValue({
                name: 'QuizStarted',
                args: [mockStartTime],
            });

            const result = await quizService.startQuiz(
                mockQuizAddress,
                mockCreatorAddress,
                mockPin,
                mockPlayerAddresses,
            );

            expect(result).toHaveProperty('startTime', mockStartTime);
            expect(mockQuiz.startQuiz).toHaveBeenCalledWith(mockPlayerAddresses);
        });

        it('should handle transaction failure', async () => {
            mockQuiz.isStarted.mockResolvedValue(false);
            mockQuiz.startQuiz.mockRejectedValue(new Error('Transaction failed'));

            await expect(
                quizService.startQuiz(
                    mockQuizAddress,
                    mockCreatorAddress,
                    mockPin,
                    mockPlayerAddresses,
                )
            ).rejects.toThrow('Transaction failed');
        });
    });

    describe('endQuiz', () => {
        const mockPlayerScores = {
            '0xplayer1': 100,
            '0xplayer2': 80,
        };
        const mockPlayerAddresses = ['0xplayer1', '0xplayer2'];

        beforeEach(() => {
            quizService['quizPins'].set(mockPin, {
                quizAddress: mockQuizAddress,
                answersString: '123',
                playerAddresses: mockPlayerAddresses,
            });

            (ethers.Contract as jest.Mock).mockImplementation(() => mockQuiz);
        });

        it('should successfully end a quiz and calculate winner', async () => {
            const mockTx = {
                wait: jest.fn().mockResolvedValue({
                    logs: [{
                        topics: [],
                        data: '',
                    }],
                }),
            };

            mockQuiz.isStarted.mockResolvedValue(true);
            mockQuiz.isFinished.mockResolvedValue(false);
            mockQuiz.CalculateWinner.mockResolvedValue(mockTx);
            mockQuiz.interface.parseLog.mockReturnValue({
                name: 'QuizFinished',
                args: ['0xplayer1', '100'],
            });

            const result = await quizService.endQuiz(
                mockQuizAddress,
                mockCreatorAddress,
                mockPin,
                mockPlayerScores,
            );

            expect(result).toEqual({
                winner: '0xplayer1',
                score: '100',
            });
        });

        it('should handle transaction failure', async () => {
            mockQuiz.isStarted.mockResolvedValue(true);
            mockQuiz.isFinished.mockResolvedValue(false);
            mockQuiz.CalculateWinner.mockRejectedValue(new Error('Transaction failed'));

            await expect(
                quizService.endQuiz(
                    mockQuizAddress,
                    mockCreatorAddress,
                    mockPin,
                    mockPlayerScores,
                )
            ).rejects.toThrow('Transaction failed');
        });
    });
});
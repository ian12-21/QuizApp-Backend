import { QuizService } from '../../src/services/quizService';
import { AppError } from '../../src/utils/AppError';

describe('QuizService', () => {
  let quizService: QuizService;
  let mockQuizModel: any;
  let mockUserAnswersModel: any;
  let mockGetContractInterface: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuizModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockUserAnswersModel = {
      findOne: jest.fn(),
    };

    mockGetContractInterface = jest.fn();

    // Make models callable as constructors
    const quizModelFn: any = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue(data),
    }));
    quizModelFn.findOne = mockQuizModel.findOne;
    quizModelFn.find = mockQuizModel.find;

    const userAnswersModelFn: any = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue(data),
    }));
    userAnswersModelFn.findOne = mockUserAnswersModel.findOne;

    quizService = new QuizService(quizModelFn, userAnswersModelFn, mockGetContractInterface);
  });

  describe('createQuiz', () => {
    const validData = {
      pin: '123456',
      creatorAddress: '0x1234567890',
      quizAddress: '0x9876543210',
      quizName: 'Test Quiz',
      answersString: '0123',
      playerAddresses: [] as string[],
      questions: [
        { question: 'Q1', answers: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      ],
    };

    it('should throw AppError when required fields are missing', async () => {
      await expect(
        quizService.createQuiz({ ...validData, pin: '' })
      ).rejects.toThrow(AppError);

      await expect(
        quizService.createQuiz({ ...validData, pin: '' })
      ).rejects.toThrow('Invalid transfer to backend');
    });

    it('should create quiz and generate dummy players', async () => {
      const result = await quizService.createQuiz({ ...validData });
      expect(result).toBeDefined();
      expect(result.pin).toBe('123456');
      expect(result.quizName).toBe('Test Quiz');
    });
  });

  describe('getQuizByPin', () => {
    const mockQuiz = {
      pin: '123456',
      creatorAddress: '0x1234567890',
      quizAddress: '0x9876543210',
      quizName: 'Test Quiz',
    };

    it('should return quiz data for valid pin', async () => {
      mockQuizModel.findOne.mockResolvedValue(mockQuiz);

      const result = await quizService.getQuizByPin('123456');

      expect(mockQuizModel.findOne).toHaveBeenCalledWith({ pin: '123456' });
      expect(result).toEqual(mockQuiz);
    });

    it('should throw AppError for non-existent pin', async () => {
      mockQuizModel.findOne.mockResolvedValue(null);

      await expect(quizService.getQuizByPin('999999')).rejects.toThrow(AppError);
      await expect(quizService.getQuizByPin('999999')).rejects.toThrow('Quiz not found');
    });
  });

  describe('getQuizWinner', () => {
    it('should return the winner', async () => {
      mockQuizModel.findOne.mockResolvedValue({
        winner: { userAddress: '0xWinner', score: 100 },
      });

      const result = await quizService.getQuizWinner('0xQuiz');
      expect(result).toEqual({ userAddress: '0xWinner', score: 100 });
    });

    it('should throw AppError when quiz not found', async () => {
      mockQuizModel.findOne.mockResolvedValue(null);

      await expect(quizService.getQuizWinner('0xInvalid')).rejects.toThrow('Quiz not found');
    });
  });

  describe('getTop3Players', () => {
    it('should return top 3 players sorted by score', async () => {
      mockQuizModel.findOne.mockResolvedValue({ quizAddress: '0xQuiz' });
      mockUserAnswersModel.findOne.mockResolvedValue({
        participants: [
          { userAddress: '0x1', score: 50 },
          { userAddress: '0x2', score: 100 },
          { userAddress: '0x3', score: 75 },
          { userAddress: '0x4', score: 25 },
        ],
      });

      const result = await quizService.getTop3Players('0xQuiz');

      expect(result).toHaveLength(3);
      expect(result[0].userAddress).toBe('0x2');
      expect(result[1].userAddress).toBe('0x3');
      expect(result[2].userAddress).toBe('0x1');
    });

    it('should return empty array when quiz not found', async () => {
      mockQuizModel.findOne.mockResolvedValue(null);

      const result = await quizService.getTop3Players('0xInvalid');
      expect(result).toEqual([]);
    });
  });

  describe('searchQuizzes', () => {
    it('should return empty array for empty query', async () => {
      const result = await quizService.searchQuizzes('');
      expect(result).toEqual([]);
    });

    it('should search by quiz name or address', async () => {
      const mockResults = [
        { quizName: 'Test', quizAddress: '0x1', creatorAddress: '0xC', pin: '123', answersString: '01' },
      ];

      const mockQuery = { select: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(mockResults) }) };
      mockQuizModel.find.mockReturnValue(mockQuery);

      const result = await quizService.searchQuizzes('Test');
      expect(result).toEqual(mockResults);
      expect(mockQuizModel.find).toHaveBeenCalled();
    });
  });
});

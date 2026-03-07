export interface IUserAnswer {
  quizAddress: string;
  userAddress: string | null;
  questionIndex: number;
  answer: number | string;
  answerTimeMs: number;
}

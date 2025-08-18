graph TD
    I[Admin/Client] -- trigger --> J[API: /api/quiz/:quizAddress/submit-all-answers]
    J -- fetch answers, scores --> K[QuizService]
    K -- call contract --> L[Ethereum Smart Contract: submitAllAnswers]
    K -- set winner --> C

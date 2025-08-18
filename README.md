# QuizApp Backend

Backend for a quiz application with MongoDB integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up MongoDB:
   - Install MongoDB on your system if not already installed
   - Create a `.env` file in the root directory with the following content:
   ```
   MONGODB_URI=mongodb://localhost:27017/quizapp
   PORT=3000
   ```
   - Adjust the MongoDB URI as needed for your environment

3. Import existing quiz data to MongoDB (optional):
```bash
npm run import-data
```

## Running the Application

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm run serve
```

## API Endpoints

- `POST /api/quiz/create` - Create a new quiz
- `GET /api/quiz/:pin` - Get quiz by PIN
- `POST /api/quiz/:pin/end` - End a quiz and set a winner

## Data Structure

The quiz data is stored in MongoDB with the following structure:

```typescript
{
  pin: string;
  creatorAddress: string;
  quizAddress: string;
  quizName: string;
  answersHash: string;
  playerAddresses: string[];
  questions: [
    {
      question: string;
      answers: string[];
      correctAnswer: number;
    }
  ];
  winner: string; // Empty string by default, set when quiz ends
  createdAt: Date;
  updatedAt: Date;
}
```




## BACK frONT contract interaciton

is it possible in backend nodejs project to initiate a smart contract function but sign it in the fronetendEditYes, this is absolutely possible and actually a common pattern for better security and user experience. Here are the main approaches:
Method 1: Transaction Building + Frontend Signing
Backend:
javascript// Build unsigned transaction
const contract = new ethers.Contract(address, abi, provider);
const unsignedTx = await contract.populateTransaction.yourFunction(params);

// Send to frontend
res.json({ unsignedTransaction: unsignedTx });
Frontend:
javascript// Sign and send
const signer = provider.getSigner();
const signedTx = await signer.sendTransaction(unsignedTransaction);


import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Smart contract ABI for the submitAllAnswers function
export const QUIZ_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "players",
        "type": "address[]"
      },
      {
        "internalType": "string[]",
        "name": "answers",
        "type": "string[]"
      },
      {
        "internalType": "uint128[]",
        "name": "scores",
        "type": "uint128[]"
      }
    ],
    "name": "submitAllAnswers",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Get provider for read-only operations
export const getProvider = () => {
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get contract interface for encoding function calls (no signer needed)
export const getQuizContractInterface = () => {
  return new ethers.Interface(QUIZ_CONTRACT_ABI);
};

// Get contract instance for read-only operations (no signer)
export const getQuizContractReadOnly = (contractAddress: string) => {
  const provider = getProvider();
  return new ethers.Contract(contractAddress, QUIZ_CONTRACT_ABI, provider);
};

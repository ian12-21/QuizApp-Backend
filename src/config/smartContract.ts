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

// Get provider and signer for blockchain interactions
export const getProvider = () => {
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

export const getSigner = () => {
  const provider = getProvider();
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }
  
  return new ethers.Wallet(privateKey, provider);
};

// Get contract instance
export const getQuizContract = (contractAddress: string) => {
  const signer = getSigner();
  return new ethers.Contract(contractAddress, QUIZ_CONTRACT_ABI, signer);
};

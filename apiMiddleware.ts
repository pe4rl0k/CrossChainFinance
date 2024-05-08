import express, { Request, Response, NextFunction, Express } from 'express';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL!;
const API_KEY = process.env.API_KEY;

app.use(express.json());
app.use(cors());
initializeRateLimiting();
addRequestLogging();
useApiKeyAuthentication();
setupRoutes();
handleErrors();

const provider = new ethers.providers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);

function initializeRateLimiting() {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  });

  app.use(limiter);
}

function useApiKeyAuthentication() {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.get('X-API-KEY');
    if (apiKey === API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
  });
}

function addRequestLogging() {
  app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.path}`);
      next();
  });
}

function setupRoutes() {
  app.get('/api/balance/:address', getBalance);
  app.post('/api/transaction', postTransaction);
  app.get('/api/subscribe/:address', subscribeToAddress);
  app.get('/health', (req: Request, res: Response) => res.status(200).send('OK'));
}

async function getBalance(req: Request, res: Response) {
  try {
      const { address } = req.params;
      const balance = await provider.getBalance(address);
      res.send({ balance: ethers.utils.formatEther(balance) });
  } catch (error) {
      res.status(500).send({ error: 'Failed to fetch balance' });
  }
}

async function postTransaction(req: Request, res: Response) {
  try {
      const { privateKey, to, value } = req.body;
      const wallet = new ethers.Wallet(privateKey, provider);
      const transaction = await wallet.sendTransaction({
          to,
          value: ethers.utils.parseEther(value),
      });
      await transaction.wait();
      res.send({ transactionHash: transaction.hash });
  } catch (error) {
      res.status(500).send({ error: 'Transaction failed' });
  }
}

function subscribeToAddress(req: Request, res: Response) {
  try {
      const { address } = req.params;
      provider.on("block", () => {
          console.log(`New block mined, checking transactions for address: ${address}`);
      });
      res.send({ subscribed: true, address });
  } catch (error) {
      res.status(500).send({ error: 'Subscription failed' });
  }
}

function handleErrors() {
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(err.stack);
      const statusCode = err instanceof CustomError ? 400 : 500; // Ensure CustomError is defined or handled properly
      res.status(statusCode).send('Something broke!');
  });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
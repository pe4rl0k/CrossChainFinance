import express from 'express';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);

const provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

const authenticateApiKey = (req, res, next) => {
    const apiKey = req.get('X-API-KEY');
    if (apiKey === process.env.API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.use(authenticateApiKey);

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.get('/api/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const balance = await provider.getBalance(address);
        res.send({ balance: ethers.utils.formatEther(balance) });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.post('/api/transaction', async (req, res) => {
    try {
        const { privateKey, to, value } = req.body;
        const wallet = new ethers.Wallet(privateKey, provider);
        const transaction = await wallet.sendTransaction({
            to,
            value: ethers.utils.parseEther(value)
        });
        await transaction.wait();
        res.send({ transactionHash: transaction.hash });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/api/subscribe/:address', (req, res) => {
    const { address } = req.params;
    provider.on("block", () => {
        console.log(`New block mined, checking transactions for address: ${address}`);
    });
    res.send({ subscribed: true, address });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

```sh
npm install cors express-rate-limit
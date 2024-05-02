import express from 'express';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const app = express();
app.use(express.json());

const provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

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
        res.send({ subscribed: true, address });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
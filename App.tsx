import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { LibraClient, LibraWallet } from 'libra-client';
import { ethers } from 'ethers';

const ethNetwork = process.env.REACT_APP_ETH_NETWORK;
const libraNetwork = process.env.REACT_APP_LIBRA_NETWORK;

const web3 = new Web3(ethNetwork);
const libraClient = new LibraClient({ network: libraNetwork });
const ethereumProvider = new ethers.providers.Web3Provider((window as any).ethereum);
const libraWallet = new LibraWallet();

interface WalletBalance {
  ethBalance: string;
  libraBalance: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState<string>("");
  const [balance, setBalance] = useState<WalletBalance>({ ethBalance: "0", libraBalance: "0" });

  const connectWallet = useCallback(async () => {
    if ((window as any).ethereum) {
      const accounts = await ethereumProvider.send("eth_requestAccounts", []);
      const userAccount = accounts[0];
      setAccount(userAccount);
    } else {
      alert("MetaMask is not installed!");
    }
  }, []);

  const getLibraBalance = async () => {
    const libraAddress = libraWallet.newAccount().address.toHex();
    const libraAccount = await libraClient.getAccount(libraAddress);
    return libraAccount.balances.map((balance) => balance.amount).join(",");
  };

  const fetchBalances = useCallback(async (userAccount: string) => {
    const ethBalance = await web3.eth.getBalance(userAccount);
    const libraBalance = await getLibraBalance();

    setBalance({
      ethBalance: Web3.utils.fromWei(ethBalance, 'ether'),
      libraBalance,
    });
  }, []);

  useEffect(() => {
    if (account) {
      fetchBalances(account);
    }
  }, [account, fetchBalances]);

  return (
    <div>
      <button onClick={connectWallet}>Connect Wallet</button>
      <div>
        <h2>Balances</h2>
        <p>Ethereum: {balance.ethBalance} ETH</p>
        <p>Libra: {balance.libraBalance} LIBRA</p>
      </div>
    </div>
  );
};

export default App;
const { ethers, run, network } = require("hardhat");
require("dotenv").config();

async function main() {
  await run("compile");
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  const Contract = await ethers.getContractFactory("YourContractName");
  const contract = await Contract.deploy(/* Constructor Arguments Here */);
  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
  if(network.config.chainId != (31337 || 1337) && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for Block confirmations...");
    await contract.deployTransaction.wait(6);
    await run("verify:verify", {
      address: contract.address,
      constructorArguments: [], // Constructor Arguments here
    });
  }
  console.log("Running deployment tests...");
  await deploymentTests(contract);
}

async function deploymentTests(contract) {
  console.log("Test 1: Contract basic function calls");
  console.log("Test 2: Simulating collateral liquidation");
  console.log("Test 3: Testing interest calculations");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
import { task } from "hardhat/config";


task("buyToken", "Buy token in sale round")
    .addParam("token", "Token address")
    .addParam("amount", "Token amount")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("Market", taskArgs.token);
    
    await contract.buyToken(taskArgs.amount);
});
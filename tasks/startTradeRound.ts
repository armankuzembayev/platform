import { task } from "hardhat/config";


task("startTradeRound", "Start trade round")
    .addParam("token", "Token address")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("Market", taskArgs.token);
    
    await contract.startTradeRound();
});
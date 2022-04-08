import { task } from "hardhat/config";


task("startSaleRound", "Start sale round")
    .addParam("token", "Token address")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("Market", taskArgs.token);
    
    await contract.startSaleRound();
});
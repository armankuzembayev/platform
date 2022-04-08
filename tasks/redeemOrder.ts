import { task } from "hardhat/config";


task("redeemOrder", "Redeem order")
    .addParam("token", "Token address")
    .addParam("id", "Order id")
    .addParam("amount", "Token amount")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("Market", taskArgs.token);
    
    await contract.redeemOrder( taskArgs.id, taskArgs.amount);
});
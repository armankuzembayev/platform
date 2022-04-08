import { task } from "hardhat/config";


task("addOrder", "Add new order in trade round")
    .addParam("token", "Token address")
    .addParam("amount", "Token amount")
    .addParam("price", "Price in ETH")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("Market", taskArgs.token);
    
    await contract.addOrder(taskArgs.amount, taskArgs.price);
});
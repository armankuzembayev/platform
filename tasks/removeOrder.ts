import { task } from "hardhat/config";


task("removeOrder", "Remove order")
    .addParam("token", "Token address")
    .addParam("id", "Order id")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("Market", taskArgs.token);
    
    await contract.removeOrder(taskArgs.id);
});
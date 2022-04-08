import { task } from "hardhat/config";


task("register", "Register new user")
    .addParam("token", "Token address")
    .addParam("referrer", "Referrer address")
    .setAction(async  (taskArgs, { ethers }) => {

    const contract = await ethers.getContractAt("Market", taskArgs.token);
    
    await contract.register(taskArgs.referrer);
});
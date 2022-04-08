import { ethers } from "hardhat";

import * as Configs from "../config"

async function main() {

    const Erc20 = await ethers.getContractFactory("Erc20");
    const erc20 = await Erc20.deploy(
        Configs.nameErc20,
        Configs.symbolErc20,
        Configs.decimals,
        Configs.totalSupply
    );

    await erc20.deployed();

    console.log("ERC20 deployed to:", erc20.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


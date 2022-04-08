import { ethers } from "hardhat";

import * as Configs from "../config"

async function main() {

  const Market = await ethers.getContractFactory("Market");
  const market = await Market.deploy
  (
    Configs.zeroAddress,
    Configs.debatingPeriodDuration
  );

  await market.deployed();

  console.log("Market deployed to:", market.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

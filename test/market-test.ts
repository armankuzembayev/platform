import { utils } from "ethers";
import { network } from "hardhat";

const { expect } = require("chai");
const { ethers } = require("hardhat");

import * as Configs from "../config"

describe("Market", function ()  {

    let Erc20Token: any;
    let erc20Token: any;
    let Market: any;
    let market: any;

    let owner: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;
    let zeroAddress = ethers.utils.getAddress(Configs.zeroAddress)


    beforeEach(async function() {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        Erc20Token = await ethers.getContractFactory("Erc20");
        const nameErc20 = Configs.nameErc20;
        const symbolErc20 = Configs.symbolErc20;
        const decimals = Configs.decimals;
        const totalSupply = Configs.totalSupply;

        erc20Token = await Erc20Token.deploy(nameErc20, symbolErc20, decimals, ethers.utils.parseEther(totalSupply));
        await erc20Token.deployed();


        Market = await ethers.getContractFactory("Market");

        market = await Market.deploy(erc20Token.address, Configs.debatingPeriodDuration);
        await market.deployed();
    });

    describe("Deployment", function() {

        it("Should initialize correctly", async function() {
            expect(await market.tradeToken()).to.equal(erc20Token.address);
            expect(await market.roundTime()).to.equal(Configs.debatingPeriodDuration);
        });
    });

    describe("Setters", function() {

        it("Should set correctly", async function() {
            await market.setTradeToken(addr1.address);
            expect(await market.tradeToken()).to.equal(addr1.address);

            await market.setRoundTime(Configs.debatingPeriodDurationTest);
            expect(await market.roundTime()).to.equal(Configs.debatingPeriodDurationTest);
        });
    });

    describe("Register", function() {

        it("Should revert", async function() {
            await expect(market.register(owner.address)).to.be.revertedWith("You cannot refer yourself");
            await expect(market.register(addr1.address)).to.be.revertedWith("User is not registered");
        })

        it("Should register new user", async function() {

            await market.register(zeroAddress);

            await market.connect(addr1).register(owner.address);
            const users = await market.users(addr1.address);
            expect(users.isEntity).to.be.true;
            expect(users.referrer1).to.be.equal(owner.address);
            expect(users.referrer2).to.be.equal(zeroAddress);
        });
    });

    describe("Sale round", function() {

        it("Should revert starting function", async function() {
            await market.startSaleRound();
            await expect(market.startSaleRound()).to.be.revertedWith("Sale has already been started");
        })

        it("Should revert buy Token function", async function() {
            await expect(market.buyToken(ethers.utils.parseEther("1"))).
            to.be.revertedWith("Not sale round");

            await market.startSaleRound();

            await expect(market.buyToken(ethers.utils.parseEther("0"))).
            to.be.revertedWith("Amount should be positive");

            await expect(market.buyToken(ethers.utils.parseEther("100001"))).
            to.be.revertedWith("Amount exceeds");

            const tx = {
                value: ethers.utils.parseEther("0.000001")
            }
            await expect(market.buyToken(ethers.utils.parseEther("1"), tx)).
            to.be.revertedWith("Not enough ether");


            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await expect(market.buyToken(ethers.utils.parseEther("1"))).
            to.be.revertedWith("Sale round was finished");
        })

        it("Should buy tokens correctly", async function() {

            await market.startSaleRound();

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);
            
            tx = {
                value: ethers.utils.parseEther("0.0001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);
        });

        it("Should buy tokens correctly with refferals", async function() {

            await market.startSaleRound();
            
            await market.register(zeroAddress);

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await market.connect(addr1).register(owner.address);

            await market.connect(addr1).buyToken(ethers.utils.parseEther("10"), tx);

            await market.connect(addr2).register(addr1.address);

            await market.connect(addr2).buyToken(ethers.utils.parseEther("10"), tx);
        });

        it("Should start sale correctly", async function() {

            await market.startSaleRound();

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration + 1]);
            await market.startTradeRound();

            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            await market.connect(addr1).redeemOrder(0, ethers.utils.parseEther("1"), tx);

            await expect(market.startSaleRound()).to.be.revertedWith("Trade round is not finished yet");

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startSaleRound();





        });
    });

    describe("Trade round", function() {

        it("Should revert", async function() {
            await expect(market.startTradeRound()).to.be.revertedWith("Trade has already been started");

            await market.startSaleRound();
            await expect(market.startTradeRound()).to.be.revertedWith("Sale round is not finished yet");

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startTradeRound();
        })

        it("Should revert add order", async function() {
            await expect(market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"))).
            to.be.revertedWith("Not trade round");

            await market.startSaleRound();
            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration + 1]);
            await market.startTradeRound();

            await expect(market.addOrder(ethers.utils.parseEther("0"), ethers.utils.parseEther("0.0001"))).
            to.be.revertedWith("Amount should be positive");

            await expect(market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0"))).
            to.be.revertedWith("Price should be positive");

            await expect(market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.01"))).
            to.be.revertedWith("Not enough balance");

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration + 1]);
            
            await expect(market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"))).
            to.be.revertedWith("Trade round was finished");
        })

        it("Should add order", async function() {
            await market.startSaleRound();

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startTradeRound();
            
            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));
        });

        it("Should revert remove order", async function() {
            await expect(market.removeOrder(0)).
            to.be.revertedWith("Not trade round");

            await market.startSaleRound();
            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration + 1]);
            await market.startTradeRound();

            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            await expect(market.removeOrder(1)).to.be.revertedWith("Wrong Id");

            await expect(market.connect(addr1).removeOrder(0)).to.be.revertedWith("Not seller");

            
            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            
            await expect(market.removeOrder(0)).
            to.be.revertedWith("Trade round was finished");
        })

        it("Should remove order", async function() {
            await market.startSaleRound();

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startTradeRound();
            
            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            await market.removeOrder(0);
        });

        it("Should revert redeem order", async function() {
            await expect(market.redeemOrder(0, ethers.utils.parseEther("0.0001"))).
            to.be.revertedWith("Not trade round");

            await market.startSaleRound();
            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration + 1]);
            await market.startTradeRound();

            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            await expect(market.redeemOrder(1, ethers.utils.parseEther("0.0001"))).to.be.revertedWith("Wrong Id");

            await expect(market.redeemOrder(0, ethers.utils.parseEther("2"))).
            to.be.revertedWith("Amount exceeds");

            await expect(market.redeemOrder(0, ethers.utils.parseEther("0.1"))).
            to.be.revertedWith("You cannot buy your tokens");
            
            tx = {
                value: ethers.utils.parseEther("0.0000001")
            }

            await expect(market.connect(addr1).redeemOrder(0, ethers.utils.parseEther("0.1"), tx)).
            to.be.revertedWith("Not enough ether");

            await market.removeOrder(0);

            await expect(market.redeemOrder(0, ethers.utils.parseEther("0.0001"))).
            to.be.revertedWith("Status is closed");

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await expect(market.redeemOrder(0, ethers.utils.parseEther("0.0001"))).
            to.be.revertedWith("Trade round was finished");
        })

        it("Should redeem order", async function() {
            await market.startSaleRound();

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startTradeRound();
            
            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            tx = {
                value: ethers.utils.parseEther("0.01")
            }

            await market.connect(addr1).redeemOrder(0, ethers.utils.parseEther("0.0001"), tx);

            tx = {
                value: ethers.utils.parseEther("0.00001")
            }

            await market.connect(addr1).redeemOrder(1, ethers.utils.parseEther("1"), tx);
        });

        it("Should redeem order registered", async function() {
            await market.startSaleRound();

            await market.connect(addr1).register(zeroAddress);

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startTradeRound();
            
            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            tx = {
                value: ethers.utils.parseEther("0.01")
            }

            await market.connect(addr1).redeemOrder(0, ethers.utils.parseEther("0.0001"), tx);
        });

        it("Should redeem order 1 refer", async function() {

            await market.startSaleRound();

            await market.connect(addr1).register(zeroAddress);
            await market.connect(addr2).register(addr1.address);

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startTradeRound();
            
            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            tx = {
                value: ethers.utils.parseEther("0.01")
            }

            await market.connect(addr2).redeemOrder(0, ethers.utils.parseEther("0.0001"), tx);
        });

        it("Should redeem order 2 refers", async function() {
            await market.startSaleRound();

            await market.connect(addr1).register(zeroAddress);
            await market.connect(addr2).register(addr1.address);
            await market.connect(addr3).register(addr2.address);

            let tx = {
                value: ethers.utils.parseEther("0.001")
            }
            await market.buyToken(ethers.utils.parseEther("10"), tx);

            await network.provider.send('evm_increaseTime', [Configs.debatingPeriodDuration]);
            await market.startTradeRound();
            
            await erc20Token.approve(market.address, ethers.utils.parseEther("10"));
            await market.addOrder(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.0001"));

            tx = {
                value: ethers.utils.parseEther("0.01")
            }

            await market.connect(addr3).redeemOrder(0, ethers.utils.parseEther("0.0001"), tx);
        });
    });

});
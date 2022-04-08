//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Market is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN = keccak256("ADMIN");

    address public tradeToken;
    uint256 public roundTime = 3 days;

    uint256 public currentPrice = 1e13;
    uint256 public tradeAmount = 1 ether;
    uint256 public constant MULTIPLIER = 103;
    uint256 public constant ADDER = 4e12;

    enum Round {
        NONE,
        SALE,
        TRADE
    }

    struct UserInfo {
        bool isEntity;
        address referrer1;
        address referrer2;
    }

    enum OrderStatus {
        NONE,
        OPEN,
        CLOSED,
        BOUGHT
    }

    struct OrderInfo {
        address seller;
        address buyer;
        uint256 amount;
        uint256 price;
        OrderStatus status;
    }

    mapping(uint256 => OrderInfo[]) public orders;

    struct RoundInfo {
        Round roundType;
        uint256 roundnumber;
    }

    RoundInfo public currentRound;
    uint256 public lastRoundStartTime;

    mapping(address => UserInfo) public users;

    constructor(address _tradeToken, uint256 _roundTime) {
        _setupRole(ADMIN, msg.sender);

        tradeToken = _tradeToken;
        roundTime = _roundTime;
    }

    function register(address _referrer) public {
        require(msg.sender != _referrer, "You cannot refer yourself");

        if (_referrer != address(0)){
            require(users[_referrer].isEntity, "User is not registered");

            users[msg.sender].referrer1 = _referrer;
            users[msg.sender].referrer2 = users[_referrer].referrer1;
        }

        users[msg.sender].isEntity = true;
    }

    function _recalculatePrice() private {
        currentPrice = currentPrice * MULTIPLIER / 100 + ADDER;
    }

    function startSaleRound() external nonReentrant {
        require(currentRound.roundType != Round.SALE, "Sale has already been started");

        if (currentRound.roundType == Round.TRADE) {
            require(
                block.timestamp - lastRoundStartTime > roundTime, 
                "Trade round is not finished yet"
            );
            
            uint256 currentRoundNumber = currentRound.roundnumber;
            for (uint256 idx = 0; idx < orders[currentRoundNumber].length; idx++) {
                if (orders[currentRoundNumber][idx].status == OrderStatus.OPEN) {
                    // transfer back
                    IERC20(tradeToken).transfer(
                        orders[currentRoundNumber][idx].seller, 
                        orders[currentRoundNumber][idx].amount
                    );
                    orders[currentRoundNumber][idx].amount = 0;
                    orders[currentRoundNumber][idx].status = OrderStatus.CLOSED;
                }

            }

            _recalculatePrice();
            currentRound.roundnumber++;
        }
        
        uint256 mintAmount = (tradeAmount / currentPrice) * 1e18;
        tradeAmount = 0;
        // mint 
        IERC20(tradeToken).mint(address(this), mintAmount);

        currentRound.roundType = Round.SALE;
        lastRoundStartTime = block.timestamp;
    }

    function buyToken(uint256 _amount) external payable {
        require(currentRound.roundType == Round.SALE, "Not sale round");
        require(block.timestamp - lastRoundStartTime < roundTime, "Sale round was finished");
        require(_amount > 0, "Amount should be positive");
        require(IERC20(tradeToken).balanceOf(address(this)) >= _amount, "Amount exceeds");

        uint256 totalPrice = currentPrice * _amount / 1e18;
        require(msg.value >= totalPrice, "Not enough ether");

        if (users[msg.sender].isEntity) {
            address ref1 = users[msg.sender].referrer1;
            if (ref1 != address(0)) {
                uint256 cashback1 = totalPrice * 5 / 100;
                payable(ref1).transfer(cashback1);

                address ref2 = users[msg.sender].referrer2;
                if (ref2 != address(0)) {
                    uint256 cashback2 = totalPrice * 3 / 100;
                    payable(ref2).transfer(cashback2);
                }
            }
        }
        uint256 redundantEth = msg.value - totalPrice;
        if (redundantEth > 0) {
            payable(msg.sender).transfer(redundantEth);
        }

        IERC20(tradeToken).transfer(msg.sender, _amount);
    }

    function startTradeRound() external {
        require(currentRound.roundType == Round.SALE, "Trade has already been started");
        require(
            block.timestamp - lastRoundStartTime > roundTime, 
            "Sale round is not finished yet"
        );

        uint256 currentBalance = IERC20(tradeToken).balanceOf(address(this));
        IERC20(tradeToken).burn(address(this), currentBalance);

        currentRound.roundType = Round.TRADE;
        lastRoundStartTime = block.timestamp;
    }

    function addOrder(uint256 _amount, uint256 _price) public {
        require(currentRound.roundType == Round.TRADE, "Not trade round");
        require(
            block.timestamp - lastRoundStartTime < roundTime, 
            "Trade round was finished"
        );
        require(_amount > 0, "Amount should be positive");
        require(_price > 0, "Price should be positive");
        require(IERC20(tradeToken).balanceOf(msg.sender) >= _amount, "Not enough balance");

        IERC20(tradeToken).transferFrom(msg.sender, address(this), _amount);
        OrderInfo memory orderInfo = OrderInfo(msg.sender, address(0), _amount, _price, OrderStatus.OPEN);
        orders[currentRound.roundnumber].push(orderInfo);
    }

    function removeOrder(uint256 _orderId) public nonReentrant {
        require(currentRound.roundType == Round.TRADE, "Not trade round");
        require(
            block.timestamp - lastRoundStartTime < roundTime, 
            "Trade round was finished"
        );
        require(_orderId < orders[currentRound.roundnumber].length, "Wrong Id");
        require(orders[currentRound.roundnumber][_orderId].seller == msg.sender, "Not seller");

        uint256 amount = orders[currentRound.roundnumber][_orderId].amount;
        IERC20(tradeToken).transfer(msg.sender, amount);

        orders[currentRound.roundnumber][_orderId].amount = 0;
        orders[currentRound.roundnumber][_orderId].status = OrderStatus.CLOSED;
    }

    function redeemOrder(uint256 _orderId, uint256 _amount) external payable nonReentrant {
        require(currentRound.roundType == Round.TRADE, "Not trade round");
        require(
            block.timestamp - lastRoundStartTime < roundTime, 
            "Trade round was finished"
        );
        require(_orderId < orders[currentRound.roundnumber].length, "Wrong Id");
        require(
            orders[currentRound.roundnumber][_orderId].status == OrderStatus.OPEN, 
            "Status is closed"
        );
        require(orders[currentRound.roundnumber][_orderId].amount >= _amount, "Amount exceeds");
        require(
            orders[currentRound.roundnumber][_orderId].seller != msg.sender, 
            "You cannot buy your tokens"
        );

        uint256 totalPrice = currentPrice * _amount / 1e18;
        require(msg.value >= totalPrice, "Not enough ether");

        tradeAmount += totalPrice;
        uint256 transferAmount = totalPrice;

        if (users[msg.sender].isEntity) {
            address ref1 = users[msg.sender].referrer1;
            if (ref1 != address(0)) {
                uint256 cashback1 = totalPrice * 25 / 1000;
                payable(ref1).transfer(cashback1);
                transferAmount -= cashback1;

                address ref2 = users[msg.sender].referrer2;
                if (ref2 != address(0)) {
                    uint256 cashback2 = totalPrice * 25 / 1000;
                    payable(ref2).transfer(cashback2);
                    transferAmount -= cashback2;
                }
            }
        }

        uint256 redundantEth = msg.value - totalPrice;
        if (redundantEth > 0) {
            payable(msg.sender).transfer(redundantEth);
        }

        IERC20(tradeToken).transfer(msg.sender, _amount);
        address seller = orders[currentRound.roundnumber][_orderId].seller;
        payable(seller).transfer(transferAmount);

        orders[currentRound.roundnumber][_orderId].buyer = msg.sender;
        orders[currentRound.roundnumber][_orderId].amount -= _amount;
        if (orders[currentRound.roundnumber][_orderId].amount == 0) {
            orders[currentRound.roundnumber][_orderId].status = OrderStatus.BOUGHT;
        }

    }

// setters
    function setTradeToken(address _tradeToken) public onlyRole(ADMIN) {
        tradeToken = _tradeToken;
    }

    function setRoundTime(uint256 _roundTime) public onlyRole(ADMIN) {
        roundTime = _roundTime;
    }
}
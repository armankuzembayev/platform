//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Erc20 is AccessControl {

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MINTER = keccak256("MINTER");
    bytes32 public constant BURNER = keccak256("BURNER");

    event Transfer(address indexed _from, address indexed _to, uint256 _amount);
    event Approval(address indexed _owner, address indexed _spender, uint256 _amount);

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _totalSupply) {
        _setRoleAdmin(MINTER, ADMIN);
        _setRoleAdmin(BURNER, ADMIN);

        _setupRole(MINTER, msg.sender);
        _setupRole(BURNER, msg.sender);

        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply;
    }

    function transfer(address _recipient, uint256 _amount) public returns (bool) {
        require(_recipient != address(0), "Cannot be zero address");
        require(balances[msg.sender] >= _amount, "Not enough balance");
    
        balances[msg.sender] -= _amount;
        balances[_recipient] += _amount;

        emit Transfer(msg.sender, _recipient, _amount);
        return true;
    }

    function transferFrom(address _sender, address _recipient, uint256 _amount) public returns (bool) {
        require(_sender != address(0), "Cannot be zero address");
        require(_recipient != address(0), "Cannot be zero address");
        require(allowances[_sender][msg.sender] >= _amount, "Not enough allowance");
        require(balances[_sender] >= _amount, "Not enough balance");

        allowances[_sender][msg.sender] -= _amount;
        balances[_sender] -= _amount;
        balances[_recipient] += _amount;

        emit Transfer(_sender, _recipient, _amount);
        return true;
    }

    function approve(address _spender, uint256 _amount) public returns (bool) {
        require(_spender != address(0), "Cannot be zero address");

        allowances[msg.sender][_spender] = _amount;

        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    function increaseAllowance(address _spender, uint256 _amount) public returns (bool) {
        require(_spender != address(0), "Cannot be zero address");

        allowances[msg.sender][_spender] += _amount;

        return true;
    }

    function decreaseAllowance(address _spender, uint256 _amount) public returns (bool) {
        require(_spender != address(0), "Cannot be zero address");

        uint256 currentAllowance = allowances[msg.sender][_spender];
        if (currentAllowance < _amount) {
            allowances[msg.sender][_spender] = 0;    
        } else {
            allowances[msg.sender][_spender] -= _amount;
        }

        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowances[_owner][_spender];
    }

    function balanceOf(address _user) public view returns (uint256) {
        return balances[_user];
    }

    function mint(address _recipient, uint256 _amount) public  {
        require(_recipient != address(0), "Cannot be zero address");
        
        totalSupply += _amount;
        balances[_recipient] += _amount;

        emit Transfer(address(0), _recipient, _amount);
    }


    function burn(address _account, uint256 _amount) public  {
        require(_account != address(0), "Cannot be zero address");
        require(totalSupply >= _amount, "Amount exceeds total supply");
        require(balances[_account] >= _amount, "Not enough balance");

        totalSupply -= _amount;
        balances[_account] -= _amount;

        emit Transfer(_account, address(0), _amount);
    }
}

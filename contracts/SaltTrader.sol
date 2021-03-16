// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ISalt.sol";

/**
 * @title SaltTrade
 */

contract SaltTrader {
    using SafeMath for uint256;
    // Salt token.
    ISalt Salt;
    address payable public dev;

    // Info of each order.
    struct SaltOrderInfo {
        address payable owner; // owner
        uint256 price; // price 
        uint256 saltID; // saltID
        bool isOpen; // open order
    }

    // Info of each order list.
    SaltOrderInfo[] public orderList;

    uint256 private _currentOrderID = 0;

    event Order(uint256 indexed orderID, address indexed user, uint256 indexed wid, uint256 price);
    event Cancel(uint256 indexed orderID, address indexed user, uint256 indexed wid);
    event Buy(uint256 indexed orderID, address indexed user, uint256 indexed wid);

    constructor(
        ISalt _Salt
    ) public {
        Salt = _Salt;
        dev = msg.sender;
        orderList.push(SaltOrderInfo({
            owner: address(0),
            price: 0,
            saltID: 0,
            isOpen: false
        }));
    }

    function withdrawFee() external {
        require(msg.sender == dev, "only dev");
        dev.transfer(address(this).balance);
    }

    function orderSalt(uint256 _saltID, uint256 _price) external {
        // transferFrom
        Salt.safeTransferFrom(msg.sender, address(this), _saltID, 1, "");

        orderList.push(SaltOrderInfo({
            owner: msg.sender,
            price: _price,
            saltID: _saltID,
            isOpen: true
        }));

        uint256 _id = _getNextOrderID();
        _incrementOrderId();

        emit Order(_id, msg.sender, _saltID, _price);

    }

    function cancel(uint256 orderID) external {
        SaltOrderInfo storage orderInfo = orderList[orderID];
        require(orderInfo.owner == msg.sender, "not your order");
        require(orderInfo.isOpen == true, "only open order can be cancel");

        orderInfo.isOpen = false;

        // transferFrom
        Salt.safeTransferFrom(address(this), msg.sender, orderInfo.saltID, 1, "");

        emit Cancel(orderID, msg.sender, orderInfo.saltID);

    }

    function buySalt(uint256 orderID) external payable {
        SaltOrderInfo storage orderInfo = orderList[orderID];
        require(orderInfo.owner != address(0),"bad address");
        require(orderInfo.owner != msg.sender, "it is your order");
        require(orderInfo.isOpen == true, "only open order can buy");
        require(msg.value == orderInfo.price, "error price");

        // 3% fee
        uint256 sellerValue = msg.value.mul(97).div(100);
        orderInfo.isOpen = false;

        // transferFrom
        Salt.safeTransferFrom(address(this), msg.sender, orderInfo.saltID, 1, "");
        orderInfo.owner.transfer(sellerValue);
        emit Buy(orderID, msg.sender, orderInfo.saltID);
    }

	function _getNextOrderID() private view returns (uint256) {
		return _currentOrderID.add(1);
	}
	function _incrementOrderId() private {
		_currentOrderID++;
	}

    function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _value, bytes calldata _data) external returns(bytes4){
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }
}
pragma solidity 0.4.21;

import "./SafeMath.sol";


library CoOrderLib {
    using SafeMath for uint;

    struct CoOrder {
        uint ID;
        mapping(address => uint) buyersInstalments;
        uint depositDdl;
        uint withdrawDdl;
        bytes32 productID;
        uint quantity;
        uint totalPrice;
        uint totalPaidAmount;
        uint index;
    }

    function create(uint ID, uint depositDdl, uint withdrawDdl, bytes32 productID, uint quantity, uint totalPrice, uint index) internal pure returns(CoOrder) {
        return CoOrder({ID: ID, depositDdl: depositDdl, withdrawDdl: withdrawDdl, productID: productID, quantity: quantity, totalPrice: totalPrice, index: index, totalPaidAmount: 0});
    }

    function depositInstalment(CoOrder storage self, address buyer, uint instalment) internal {
        self.buyersInstalments[buyer] = self.buyersInstalments[buyer].add(instalment);
        self.totalPaidAmount = self.totalPaidAmount.add(instalment);
    }

    function withdrawInstalment(CoOrder storage self, address buyer) internal {
        uint amount = self.buyersInstalments[buyer];
        self.buyersInstalments[buyer] = 0;
        self.totalPaidAmount = self.totalPaidAmount.sub(amount);
    }

    function isPaid(CoOrder storage self) internal view returns(bool) {
        return self.totalPaidAmount >= self.totalPrice;
    }
}

pragma solidity 0.4.21;

import "./SafeMath.sol";


library ProductLib {
    using SafeMath for uint;

    struct Product {
        string name;
        uint price;
        uint quantity;
        uint index;
    }

    function create(string name, uint price, uint quantity, uint index) internal pure returns(Product) {
        return Product({name: name, price: price, quantity: quantity, index: index});
    }

    function getOffer(Product storage self, uint quantity) internal view returns(uint) {
        if (quantity >= 3) {
            return quantity.mul((self.price * 9) / 10);
        }
        return quantity.mul(self.price);
    }

}

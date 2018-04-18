pragma solidity 0.4.21;


contract AbstractShopfront {
    function buy(bytes32 ID, uint quantity) public payable {}

    function updateQuantity(bytes32 ID, uint newQuantity) public {}

    function createProduct(string name, uint price, uint quantity) public returns(bytes32) {}

    function getProduct(bytes32 ID) public view returns(string name, uint price, uint quantity) {}

    function getProducts() public view returns(bytes32[]) {}

    function getPrice(bytes32 ID, uint quantity) public view returns (uint) {}

    function withdraw() public {}
}

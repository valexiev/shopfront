pragma solidity 0.4.21;

import "./Ownable.sol";
import "./SafeMath.sol";
import "./AbstractShopfront.sol";
import "./ProductLib.sol";
import "./CoOrderLib.sol";


contract Shopfront is Ownable, AbstractShopfront {
    using SafeMath for uint;
    using ProductLib for ProductLib.Product;
    using CoOrderLib for CoOrderLib.CoOrder;

    uint constant CO_ORDER_DEPOSIT_PERIOD = 1 hours;
    uint constant CO_ORDER_WITHDRAW_PERIOD = 60 days;

    mapping(bytes32 => ProductLib.Product) products;
    bytes32[] productIds;

    uint public lockedFunds; // Keep the funds of open co-orders locked
    mapping(uint => CoOrderLib.CoOrder) coOrders;
    uint[] coOrderIds;
    uint nextCoOrderId;


    /* * * MODIFIERS * * */

    modifier productExists(bytes32 ID) {
        require(ID == productIds[products[ID].index]);
        _;
    }

    modifier hasInStock(bytes32 ID, uint quantity) {
        require(quantity > 0 && quantity <= products[ID].quantity);
        _;
    }

    modifier coOrderExists(uint ID) {
        require(coOrders[ID].depositDdl > 0);
        _;
    }

    modifier isCoOrderOpen(uint ID) {
        uint depositDdl = coOrders[ID].depositDdl;
        require(depositDdl > 0 && now <= depositDdl);
        _;
    }


    /* * * EVENTS * * */

    /* Product Events */
    event LogCreateProduct(bytes32 indexed ID, string name, uint price, uint quantity);
    event LogUpdateQuantity(bytes32 indexed ID, uint quantity);
    event LogUpdatePrice(bytes32 indexed ID, uint quantity);
    event LogDeleteProduct(bytes32 indexed ID);
    event LogBuyProduct(address indexed buyer, bytes32 indexed ID, uint quantity);

    /* CoOrder Events */
    event LogCreateCoOrder(uint indexed coOrderID, bytes32 indexed productID, uint total, uint quantity);
    event LogDepositInstalment(uint indexed coOrderID, address buyer, uint amount);
    event LogFulfilCoOrder(uint indexed coOrderID);
    event LogWithdrawInstalment(uint indexed coOrderID, address indexed buyer);
    event LogRemoveCoOrder(uint indexed coOrderID);
    event LogCleanOverdueCoOrder(uint indexed coOrderID);


    /* * * METHODS * * */

    function() payable public {}


    /* CRUD PRODUCT */

    function createProduct(string name, uint price, uint quantity) public onlyOwner returns(bytes32) {
        /* The name must be unique */
        bytes32 ID = keccak256(name);
        require(ID != keccak256('') && (productIds.length == 0 || ID != productIds[products[ID].index]));

        ProductLib.Product memory product = ProductLib.create(name, price, quantity, productIds.length);

        products[ID] = product;
        productIds.push(ID);

        emit LogCreateProduct(ID, name, price, quantity);

        return ID;
    }

    function getProduct(bytes32 ID) public view productExists(ID) returns(string name, uint price, uint quantity) {
        ProductLib.Product memory product = products[ID];
        return (product.name, product.price, product.quantity);
    }

    function getProducts() public view returns(bytes32[]) {
        return productIds;
    }

    function updateQuantity(bytes32 ID, uint newQuantity) public onlyOwner productExists(ID) {
        products[ID].quantity = newQuantity;
        emit LogUpdateQuantity(ID, newQuantity);
    }

    function updatePrice(bytes32 ID, uint newPrice) public onlyOwner productExists(ID) {
        products[ID].price = newPrice;
        emit LogUpdatePrice(ID, newPrice);
    }

    function removeProduct(bytes32 ID) public onlyOwner productExists(ID) {
        ProductLib.Product storage productToDelete = products[ID];

        bytes32 lastProductID = productIds[productIds.length - 1];
        productIds[productToDelete.index] = lastProductID;

        products[lastProductID].index = productToDelete.index;
        productIds.length--;

        delete products[ID];
        emit LogDeleteProduct(ID);
    }


    /* TRADE */

    function getPrice(bytes32 ID, uint quantity) public view productExists(ID) hasInStock(ID, quantity) returns (uint) {
        return products[ID].getOffer(quantity);
    }

    function buy(bytes32 ID, uint quantity) public payable productExists(ID) hasInStock(ID, quantity) {
        ProductLib.Product storage product = products[ID];

        uint totalPrice = product.getOffer(quantity);
        require(msg.value >= totalPrice);

        product.quantity = product.quantity.sub(quantity);

        emit LogBuyProduct(msg.sender, ID, quantity);
    }


    /* CO-ORDERS */

    function createCoPurchase(bytes32 productID, uint quantity) public payable productExists(productID) hasInStock(productID, quantity) {
        ProductLib.Product storage product = products[productID];

        uint totalPrice = product.getOffer(quantity);
        require(msg.value >= totalPrice.div(10)); // Require minimum deposit

        product.quantity = product.quantity.sub(quantity);
        uint depositDdl = now + CO_ORDER_DEPOSIT_PERIOD;
        uint withdrawDdl = now + CO_ORDER_WITHDRAW_PERIOD;
        CoOrderLib.CoOrder memory coOrder = CoOrderLib.create(nextCoOrderId, depositDdl, withdrawDdl, productID, quantity, totalPrice, coOrderIds.length);

        coOrders[coOrder.ID] = coOrder;
        coOrderIds.push(coOrder.ID);
        emit LogCreateCoOrder(coOrder.ID, productID, totalPrice, quantity);

        nextCoOrderId++;

        payInstalment(coOrder.ID, msg.sender, msg.value);
    }

    function depositInstalment(uint coOrderID) public payable isCoOrderOpen(coOrderID) {
        payInstalment(coOrderID, msg.sender, msg.value);
    }

    function payInstalment(uint coOrderID, address buyer, uint instalment) private {
        CoOrderLib.CoOrder storage coOrder = coOrders[coOrderID];

        coOrder.depositInstalment(buyer, instalment);

        emit LogDepositInstalment(coOrderID, buyer, instalment);

        if (coOrder.isPaid()) {
            lockedFunds = lockedFunds.sub(coOrder.totalPaidAmount.sub(instalment));
            removeCoOrder(coOrderID);
            emit LogFulfilCoOrder(coOrderID);
        } else {
            lockedFunds = lockedFunds.add(instalment);
        }
    }

    function withdrawInstalment(uint coOrderID) public coOrderExists(coOrderID) {
        CoOrderLib.CoOrder storage coOrder = coOrders[coOrderID];

        uint withdrawDdl = coOrder.withdrawDdl;
        require(now <= withdrawDdl);

        address buyer = msg.sender;
        uint instalment = coOrder.buyersInstalments[buyer];
        require(instalment > 0);
        coOrder.withdrawInstalment(buyer);

        buyer.transfer(instalment);
        lockedFunds = lockedFunds.sub(instalment);
        emit LogWithdrawInstalment(coOrderID, buyer);

        if (coOrder.totalPaidAmount == 0 && now > coOrder.depositDdl) {
            /* The coOrder was not fully paid before the depositDdl and all the buyers have withdrawn their instalments */
            removeCoOrder(coOrderID);
            emit LogRemoveCoOrder(coOrderID);
        }
    }

    function removeCoOrder(uint coOrderID) private {
        CoOrderLib.CoOrder storage coOrderToDelete = coOrders[coOrderID];

        uint lastItemID = coOrderIds[coOrderIds.length - 1];
        coOrderIds[coOrderToDelete.index] = lastItemID;

        coOrders[lastItemID].index = coOrderToDelete.index;
        coOrderIds.length--;

        delete coOrders[coOrderID];
    }

    function getCoOrders() public view returns(uint[]) {
        return coOrderIds;
    }

    function getCoOrder(uint coOrderID) public view coOrderExists(coOrderID) returns(uint depositDdl, bytes32 productID, uint quantity, uint totalPrice, uint totalPaidAmount) {
        CoOrderLib.CoOrder storage coOrder = coOrders[coOrderID];
        return (coOrder.depositDdl, coOrder.productID, coOrder.quantity, coOrder.totalPrice, coOrder.totalPaidAmount);
    }

    /* OVERDUE CO-ORDERS */

    // Should call after depositDdl to release reserved quantities
    function releaseItems(uint coOrderID) public onlyOwner {
        CoOrderLib.CoOrder storage coOrder = coOrders[coOrderID];
        uint depositDdl = coOrder.depositDdl;
        require(depositDdl > 0 && now > depositDdl); // The coOrder exists and it is overdue

        bytes32 productID = coOrder.productID;

        string memory name;
        uint price;
        uint quantity;

        (name, price, quantity) = getProduct(productID);

        quantity = quantity.add(coOrder.quantity);
        updateQuantity(productID, quantity);
    }

    // Should call after withdrawDdl
    function cleanOverdueCoOrder(uint coOrderID) public onlyOwner coOrderExists(coOrderID) {
        CoOrderLib.CoOrder storage coOrder = coOrders[coOrderID];
        require(now > coOrder.withdrawDdl);

        // The buyers haven't widrawn their instalments for too long time
        // so the contract will get the funds
        lockedFunds = lockedFunds.sub(coOrder.totalPaidAmount);
        removeCoOrder(coOrderID);
        emit LogCleanOverdueCoOrder(coOrderID);
    }


    /* ADMIN */

    function withdraw() public onlyOwner {
        uint availableBalance = address(this).balance.sub(lockedFunds);
        require(availableBalance > 0);
        owner.transfer(availableBalance);
    }

}

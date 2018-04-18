const Shopfront = artifacts.require("Shopfront")
const {expectThrow, getTxGasCost, expectEvent, expectEvents, timeTravel} = require('./utils')


contract("Shopfront", async (accounts) => {
    var shopInstance

    const OWNER = accounts[0]
    const USER = accounts[1]
    const USER_2 = accounts[2]

    const ADDRESS = "0x123"

    const PRODUCT_NAME = 'Ferrari'
    const PRODUCT = {
        id: web3.sha3(PRODUCT_NAME),
        name: PRODUCT_NAME,
        price: 50000,
        quantity: 8
    }

    const NON_EXISTING_PRODUCT_ID = web3.sha3('Wiesman')

    const HOUR = 60 * 60;
	const TWO_HOURS = 2 * HOUR;

	const DAY = 24 * HOUR;
	const SIXTY_DAYS = 60 * DAY;


    describe("Init contract", () => {

        before(async function() {
            shopInstance = await Shopfront.new({from: OWNER})
        })

        it("Should set the correct owner.", async function() {
            const resOwner = await shopInstance.owner.call()
            assert.strictEqual(OWNER, resOwner, "The owner is not correct.")
        })

        it("Should NOT have any products.", async function() {
            const products = await shopInstance.getProducts()
            assert.lengthOf(products, 0, "There should be 0 PRODUCTS[0].")
        })

        it("Should NOT have any co-orders.", async function() {
            const coOrders = await shopInstance.getCoOrders()
            assert.lengthOf(coOrders, 0, "There should be 0 co-orders.")
        })

    })


    describe("CRUD Product", () => {

        describe("Create", () => {

            beforeEach(async function() {
                shopInstance = await Shopfront.new({from: OWNER})
            })

            it("Owner should create a product.", async function() {
                let result = await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                expectEvent("LogCreateProduct", result)

                const resProducts = await shopInstance.getProducts()
                assert.lengthOf(resProducts, 1, "There should be 1 item.")
            })

            it("Should NOT create a second product with the same name.", async function() {
                await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                await expectThrow(shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER}))
            })

            it("Should create a product with correct ID.", async function() {
                let ID = await shopInstance.createProduct.call(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                assert.strictEqual(ID, PRODUCT.id, "The product ID is not correct.")
            })

            it("Should NOT create a product with empty string for name.", async function() {
                await expectThrow(shopInstance.createProduct('', PRODUCT.price, PRODUCT.quantity, {from: OWNER}))
            })

            it("User should NOT create a product.", async function() {
                await expectThrow(shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: USER}))
            })

        })

        describe("Retrieve", () => {

            before(async function() {
                shopInstance = await Shopfront.new({from: OWNER})
                await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
            })

            it("Should get an existing product.", async function() {
                const resProduct = await shopInstance.getProduct(PRODUCT.id, {from: USER})
                assert.strictEqual(resProduct[0], PRODUCT.name, "The product name is not correct.")
                assert.equal(resProduct[1].toNumber(), PRODUCT.price, "The product price is not correct.")
                assert.equal(resProduct[2].toNumber(), PRODUCT.quantity, "The product quantity is not correct.")
            })

            it("Should NOT get a non-existing product.", async function() {
                await expectThrow(shopInstance.getProduct(NON_EXISTING_PRODUCT_ID, {from: USER}))
            })

        })

        describe("Update", () => {
            const newQuantity = 100
            const newPrice = 88888

            beforeEach(async function() {
                shopInstance = await Shopfront.new({from: OWNER})
                await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
            })

            // QUANTITY

            it("Owner should update quantity of an existin product.", async function() {
                const result = await shopInstance.updateQuantity(PRODUCT.id, newQuantity, {from: OWNER})
                expectEvent("LogUpdateQuantity", result)

                const resProduct = await shopInstance.getProduct(PRODUCT.id)
                assert.equal(resProduct[2].toNumber(), newQuantity, "The quantity is not updated correctly.")
            })

            it("Owner should NOT update quantity of non-existing product.", async function() {
                await expectThrow(shopInstance.updateQuantity(NON_EXISTING_PRODUCT_ID, newQuantity, {from: OWNER}))
            })

            it("User should NOT update quantity of an existin product.", async function() {
                await expectThrow(shopInstance.updateQuantity(PRODUCT.id, newQuantity, {from: USER}))
            })

            it("User should NOT update quantity of non-existing product.", async function() {
                await expectThrow(shopInstance.updateQuantity(NON_EXISTING_PRODUCT_ID, newQuantity, {from: USER}))
            })

            // PRICE

            it("Owner should update price of an existin product.", async function() {
                const result = await shopInstance.updatePrice(PRODUCT.id, newPrice, {from: OWNER})
                expectEvent("LogUpdatePrice", result)

                const resProduct = await shopInstance.getProduct(PRODUCT.id)
                assert.equal(resProduct[1].toNumber(), newPrice, "The price is not updated correctly.")
            })

            it("Owner should NOT update price of non-existing product.", async function() {
                await expectThrow(shopInstance.updatePrice(NON_EXISTING_PRODUCT_ID, newPrice, {from: OWNER}))
            })

            it("User should NOT update price of an existin product.", async function() {
                await expectThrow(shopInstance.updatePrice(PRODUCT.id, newPrice, {from: USER}))
            })

            it("User should NOT update price of non-existing product.", async function() {
                await expectThrow(shopInstance.updatePrice(NON_EXISTING_PRODUCT_ID, newPrice, {from: USER}))
            })

        })

        describe("Delete", () => {

            beforeEach(async function() {
                shopInstance = await Shopfront.new({from: OWNER})
                await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
            })

            it("Owner should delete an existin product.", async function() {
                const result = await shopInstance.removeProduct(PRODUCT.id, {from: OWNER})
                expectEvent("LogDeleteProduct", result)

                await expectThrow(shopInstance.getProduct(PRODUCT.id))

                const resProducts = await shopInstance.getProducts()
                assert.lengthOf(resProducts, 0, "There should be 0 items.")
            })

            it("Owner should NOT delete non-existing product.", async function() {
                await expectThrow(shopInstance.removeProduct(NON_EXISTING_PRODUCT_ID, {from: OWNER}))
            })

            it("User should NOT delete an existin product.", async function() {
                await expectThrow(shopInstance.removeProduct(PRODUCT.id, {from: USER}))
            })

            it("User should NOT delete non-existing product.", async function() {
                await expectThrow(shopInstance.removeProduct(NON_EXISTING_PRODUCT_ID, {from: USER}))
            })

        })

    })


    describe("Trade", () => {
        var ONE_ETH = web3.toWei(1, "ether")

        describe("Offer", () => {

            beforeEach(async function() {
                shopInstance = await Shopfront.new({from: OWNER})
                await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
            })

            it("Should get price for 1 piece of an existing product in stock.", async function() {
                const price = await shopInstance.getPrice(PRODUCT.id, 1)
                assert.equal(price.toNumber(), PRODUCT.price, "The price is not correct.")
            })

            it("Should get price with discount for 3 pieces of an existing product in stock.", async function() {
                const price = await shopInstance.getPrice(PRODUCT.id, 3)
                const expectedPrice = PRODUCT.price * 3 * 9 / 10
                assert.equal(price.toNumber(), expectedPrice, "The price is not correct.")
            })

            it("Should NOT get price for a non-existing product.", async function() {
                await expectThrow(shopInstance.getPrice(NON_EXISTING_PRODUCT_ID, 1))
            })

            it("Should NOT get price for an existing product with unsufficient stock.", async function() {
                await expectThrow(shopInstance.getPrice(PRODUCT.id, 10))
            })
        })

        describe("Purchase", () => {

            beforeEach(async function() {
                shopInstance = await Shopfront.new({from: OWNER})
                await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
            })

            async function buyExistingProductInStock(quantity) {
                const price = await shopInstance.getPrice(PRODUCT.id, quantity)
                const result = await shopInstance.buy(PRODUCT.id, quantity, {from: USER, value: price})
                expectEvent("LogBuyProduct", result)

                const resProduct = await shopInstance.getProduct(PRODUCT.id)
                assert.equal(resProduct[2].toNumber(), (PRODUCT.quantity - quantity), "The quantity left in stock is not correct.")
            }

            it("Should buy 1 piece of an existing product in stock.", async function() {
                buyExistingProductInStock(1)
            })

            it("Should buy with discount 3 pieces of an existing product in stock.", async function() {
                buyExistingProductInStock(3)
            })

            it("Should NOT buy a non-existing product.", async function() {
                await expectThrow(shopInstance.buy(NON_EXISTING_PRODUCT_ID, 1, {from: USER, value: ONE_ETH}))
            })

            it("Should NOT buy an existing product with unsufficient stock.", async function() {
                const extraQuantity = PRODUCT.quantity + 10
                await expectThrow(shopInstance.buy(PRODUCT.id, extraQuantity, {from: USER, value: ONE_ETH}))
            })

            it("Should NOT buy for less money.", async function() {
                const unsufficientAmount = await shopInstance.getPrice(PRODUCT.id, 1) - 1
                await expectThrow(shopInstance.buy(PRODUCT.id, 1, {from: USER, value: unsufficientAmount}))
            })

        })

        describe("Co-Purchase", () => {
            const CO_ORDER_ID = 0
            const FIRST_INSTALMENT = Math.round(PRODUCT.price/2)

            describe("Create co-order", () => {

                beforeEach(async function() {
                    shopInstance = await Shopfront.new({from: OWNER})
                    await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                })

                it("Should create co-order for an existing product in stock and deposit a sufficient instalment.", async function() {
                    const quantity = 1
                    const instalment = PRODUCT.price - 20000
                    const result = await shopInstance.createCoPurchase(PRODUCT.id, quantity, {from: USER, value: instalment})
                    expectEvents(["LogCreateCoOrder", "LogDepositInstalment"], result)

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), instalment, "The value of lockedFunds is not correct.")

                    const resProduct = await shopInstance.getProduct(PRODUCT.id)
                    assert.equal(resProduct[2].toNumber(), (PRODUCT.quantity - quantity), "The quantity left in stock is not correct.")

                    const resCoOrders = await shopInstance.getCoOrders()
                    assert.lengthOf(resCoOrders, 1, "There should be 1 coOrder.")

                    const timestamp = web3.eth.getBlock("latest").timestamp
                    const ddl = timestamp + HOUR

                    const resCoOrder = await shopInstance.getCoOrder(resCoOrders[0])
                    assert.equal(resCoOrder[0].toNumber(), ddl, "The coOrder ddl is not correct.")
                    assert.strictEqual(resCoOrder[1], PRODUCT.id, "The coOrder product ID is not correct.")
                    assert.equal(resCoOrder[2].toNumber(), quantity, "The coOrder quantity is not correct.")
                    assert.equal(resCoOrder[3].toNumber(), PRODUCT.price, "The coOrder totalPrice is not correct.")
                    assert.equal(resCoOrder[4].toNumber(), instalment, "The coOrder totalPaidAmount is not correct.")
                })

                it("Should create co-order for an existing product in stock and pay the full price.", async function() {
                    const result = await shopInstance.createCoPurchase(PRODUCT.id, 1, {from: USER, value: PRODUCT.price})
                    expectEvents(["LogCreateCoOrder", "LogDepositInstalment", "LogFulfilCoOrder"], result)

                    const resCoOrders = await shopInstance.getCoOrders()
                    assert.lengthOf(resCoOrders, 0, "There should be 0 coOrders.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })

                it("Should NOT create co-order for an existing product in stock and deposit less than minimum instalment.", async function() {
                    await expectThrow(shopInstance.createCoPurchase(PRODUCT.id, 1, {from: USER, value: Math.round(PRODUCT.price/12)}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })

                it("Should NOT create co-order for a non-existing product.", async function() {
                    await expectThrow(shopInstance.createCoPurchase(NON_EXISTING_PRODUCT_ID, 1, {from: USER, value: ONE_ETH}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })

                it("Should NOT create co-order for an existing product with unsufficient stock.", async function() {
                    const extraQuantity = PRODUCT.quantity + 10
                    await expectThrow(shopInstance.createCoPurchase(PRODUCT.id, extraQuantity, {from: USER, value: ONE_ETH}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })
            })

            describe("Deposit", () => {

                beforeEach(async function() {
                    shopInstance = await Shopfront.new({from: OWNER})
                    await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                    await shopInstance.createCoPurchase(PRODUCT.id, 1, {from: USER, value: FIRST_INSTALMENT})
                })

                it("Should deposit an instalment to an open co-order.", async function() {
                    const instalment = 1
                    const expectedTotalPaidAmount = FIRST_INSTALMENT + instalment

                    const result = await shopInstance.depositInstalment(CO_ORDER_ID, {from: USER_2, value: instalment})
                    expectEvent("LogDepositInstalment", result)

                    const resCoOrder = await shopInstance.getCoOrder(CO_ORDER_ID)
                    assert.equal(resCoOrder[4].toNumber(), expectedTotalPaidAmount, "The coOrder totalPaidAmount is not correct.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), expectedTotalPaidAmount, "The value of lockedFunds is not correct.")
                })

                it("Should deposit the last instalment to an open co-order.", async function() {
                    const result = await shopInstance.depositInstalment(CO_ORDER_ID, {from: USER_2, value: ONE_ETH})
                    expectEvents(["LogDepositInstalment", "LogFulfilCoOrder"], result)

                    const resCoOrders = await shopInstance.getCoOrders()
                    assert.lengthOf(resCoOrders, 0, "There should be 0 coOrders.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })

                it("Should NOT deposit an instalment to a closed co-order.", async function() {
                    const instalment = 1

                    await timeTravel(web3, (HOUR + 1));
                    await expectThrow(shopInstance.depositInstalment(CO_ORDER_ID, {from: USER_2, value: instalment}))

                    const resCoOrder = await shopInstance.getCoOrder(CO_ORDER_ID)
                    assert.equal(resCoOrder[4].toNumber(), FIRST_INSTALMENT, "The coOrder totalPaidAmount is not correct.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), FIRST_INSTALMENT, "The value of lockedFunds is not correct.")
                })

                it("Should NOT deposit an instalment to non-existing co-order.", async function() {
                    await expectThrow(shopInstance.depositInstalment(2, {from: USER_2, value: 1}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), FIRST_INSTALMENT, "The value of lockedFunds is not correct.")
                })

            })

            describe("Withdraw", () => {

                beforeEach(async function() {
                    shopInstance = await Shopfront.new({from: OWNER})
                    await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                    await shopInstance.createCoPurchase(PRODUCT.id, 1, {from: USER, value: FIRST_INSTALMENT})
                })

                it("Buyer should withdraw their instalment from open co-order.", async function() {
                    let initialBalance = web3.eth.getBalance(USER)
                    const tx = await shopInstance.withdrawInstalment(CO_ORDER_ID, {from: USER})
                    let gasCost = getTxGasCost(tx)
                    let finalBalance = web3.eth.getBalance(USER)
                    let withdrawAmount = finalBalance.minus(initialBalance).plus(gasCost)
                    assert.equal(withdrawAmount.toNumber(), FIRST_INSTALMENT, "The withdrawn amount is not correct.")

                    expectEvent("LogWithdrawInstalment", tx)

                    const resCoOrders = await shopInstance.getCoOrders()
                    assert.lengthOf(resCoOrders, 1, "There should be 1 coOrder.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })

                it("Buyer should withdraw their instalment from a co-order after deposit DDL.", async function() {
                    await timeTravel(web3, (HOUR + 1));

                    let initialBalance = web3.eth.getBalance(USER)
                    let tx = await shopInstance.withdrawInstalment(CO_ORDER_ID, {from: USER})
                    let gasCost = getTxGasCost(tx)
                    let finalBalance = web3.eth.getBalance(USER)
                    let withdrawAmount = finalBalance.minus(initialBalance).plus(gasCost)
                    assert.equal(withdrawAmount.toNumber(), FIRST_INSTALMENT, "The withdrawn amount is not correct.")

                    expectEvents(["LogWithdrawInstalment", "LogRemoveCoOrder"], tx)

                    const resCoOrders = await shopInstance.getCoOrders()
                    assert.lengthOf(resCoOrders, 0, "There should be 0 coOrders.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })

                it("Buyer should NOT withdraw their instalment from a co-order after withdraw DDL.", async function() {
                    await timeTravel(web3, (SIXTY_DAYS + 1));

                    await expectThrow(shopInstance.withdrawInstalment(CO_ORDER_ID, {from: USER}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), FIRST_INSTALMENT, "The value of lockedFunds is not correct.")
                })

                it("Non-buyer should NOT withdraw from open co-order.", async function() {
                    await expectThrow(shopInstance.withdrawInstalment(CO_ORDER_ID, {from: USER_2}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), FIRST_INSTALMENT, "The value of lockedFunds is not correct.")
                })

                it("Non-buyer should NOT withdraw from closed co-order.", async function() {
                    await timeTravel(web3, (HOUR + 1));

                    await expectThrow(shopInstance.withdrawInstalment(CO_ORDER_ID, {from: USER_2}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), FIRST_INSTALMENT, "The value of lockedFunds is not correct.")
                })

                it("Should NOT withdraw from non-existing co-order.", async function() {
                    await expectThrow(shopInstance.withdrawInstalment(2, {from: USER}))

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), FIRST_INSTALMENT, "The value of lockedFunds is not correct.")
                })
            })

            describe("Admin - releaseItems", () => {

                beforeEach(async function() {
                    shopInstance = await Shopfront.new({from: OWNER})
                    await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                    await shopInstance.createCoPurchase(PRODUCT.id, 1, {from: USER, value: FIRST_INSTALMENT})
                })

                it("Owner should release items from co-order after deposit DDL.", async function() {
                    await timeTravel(web3, (HOUR + 1));

                    const result = await shopInstance.releaseItems(CO_ORDER_ID, {from: OWNER})
                    expectEvent("LogUpdateQuantity", result)

                    const resProduct = await shopInstance.getProduct(PRODUCT.id)
                    assert.equal(resProduct[2].toNumber(), PRODUCT.quantity, "The quantity is not updated correctly.")
                })

                it("Owner should NOT release items from co-order before deposit DDL.", async function() {
                    await expectThrow(shopInstance.releaseItems(CO_ORDER_ID, {from: OWNER}))
                })

                it("Owner should NOT release items from non-existing co-order.", async function() {
                    await expectThrow(shopInstance.releaseItems(2, {from: OWNER}))
                })

                it("User should NOT release items from co-order.", async function() {
                    await expectThrow(shopInstance.releaseItems(CO_ORDER_ID, {from: USER}))
                })

                it("User should NOT release items from non-existing co-order.", async function() {
                    await expectThrow(shopInstance.releaseItems(2, {from: USER}))
                })

            })

            describe("Admin - cleanOverdueCoOrder", () => {

                beforeEach(async function() {
                    shopInstance = await Shopfront.new({from: OWNER})
                    await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
                    await shopInstance.createCoPurchase(PRODUCT.id, 1, {from: USER, value: FIRST_INSTALMENT})
                })

                it("Owner should clean co-order after withdraw DDL.", async function() {
                    await timeTravel(web3, (SIXTY_DAYS + 1));

                    const result = await shopInstance.cleanOverdueCoOrder(CO_ORDER_ID, {from: OWNER})
                    expectEvent("LogCleanOverdueCoOrder", result)

                    const resCoOrders = await shopInstance.getCoOrders()
                    assert.lengthOf(resCoOrders, 0, "There should be 0 coOrders.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), 0, "The value of lockedFunds is not correct.")
                })

                it("Owner should NOT clean co-order before withdraw DDL.", async function() {
                    await expectThrow(shopInstance.cleanOverdueCoOrder(CO_ORDER_ID, {from: OWNER}))

                    const resCoOrders = await shopInstance.getCoOrders()
                    assert.lengthOf(resCoOrders, 1, "There should be 1 coOrder.")

                    const lockedFunds = await shopInstance.lockedFunds.call()
                    assert.strictEqual(lockedFunds.toNumber(), FIRST_INSTALMENT, "The value of lockedFunds is not correct.")
                })

                it("Owner should NOT clean non-existing co-order.", async function() {
                    await expectThrow(shopInstance.cleanOverdueCoOrder(2, {from: OWNER}))
                })

                it("User should NOT clean co-order.", async function() {
                    await expectThrow(shopInstance.cleanOverdueCoOrder(CO_ORDER_ID, {from: USER}))
                })

                it("User should NOT clean non-existing co-order.", async function() {
                    await expectThrow(shopInstance.cleanOverdueCoOrder(2, {from: USER}))
                })
            })

        })

    })


    describe("Admin", () => {

        before(async function() {
            shopInstance = await Shopfront.new({from: OWNER})
        })

        it("Owner should withdraw 1000 wei.", async function() {
            const AMOUNT_TO_WITHDRAW = 1000

            await shopInstance.sendTransaction({from: OWNER, value: AMOUNT_TO_WITHDRAW})

            let initialOwnerBalance = web3.eth.getBalance(OWNER)

            let tx = await shopInstance.withdraw({from: OWNER})
            let gasCost = getTxGasCost(tx)

            let finalOwnerBalance = web3.eth.getBalance(OWNER)

            let withdrawAmount = finalOwnerBalance.minus(initialOwnerBalance).plus(gasCost)

            assert.equal(withdrawAmount.toNumber(), AMOUNT_TO_WITHDRAW, "The withdrawn amount is not correct.")
        })

        it("Owner should withdraw without locked funds.", async function() {
            const AMOUNT_TO_WITHDRAW = 1000

            await shopInstance.sendTransaction({from: OWNER, value: AMOUNT_TO_WITHDRAW})
            await shopInstance.createProduct(PRODUCT.name, PRODUCT.price, PRODUCT.quantity, {from: OWNER})
            await shopInstance.createCoPurchase(PRODUCT.id, 1, {from: USER, value: Math.round(PRODUCT.price/2)})

            let initialOwnerBalance = web3.eth.getBalance(OWNER)

            let tx = await shopInstance.withdraw({from: OWNER})
            let gasCost = getTxGasCost(tx)

            let finalOwnerBalance = web3.eth.getBalance(OWNER)

            let withdrawAmount = finalOwnerBalance.minus(initialOwnerBalance).plus(gasCost)

            assert.equal(withdrawAmount.toNumber(), AMOUNT_TO_WITHDRAW, "The withdrawn amount is not correct.")
        })

        it("User should not withdraw anything.", async function() {
            await shopInstance.sendTransaction({from: USER, value: 3000})
            await expectThrow(shopInstance.withdraw({from: USER}))
        })

    })

})

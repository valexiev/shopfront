const BigNumber = web3.BigNumber

module.exports = {
	expectThrow: async promise => {
		try {
			let result = await promise
		} catch (error) {
			const invalidJump = error.message.search('invalid JUMP') >= 0
			const invalidOpcode = error.message.search('invalid opcode') >= 0
			const outOfGas = error.message.search('out of gas') >= 0
			const revert = error.message.search('revert') >= 0
			assert(invalidJump || invalidOpcode || outOfGas || revert, "Expected throw, got '" + error + "' instead")
			return
		}
		assert.fail('Expected throw not received')
	},

	getTxGasCost: tx => {
		let amount = tx.receipt.gasUsed
		let price = web3.eth.getTransaction(tx.tx).gasPrice

		return new BigNumber(price * amount)
	},

	expectEvent: (expectedEventName, result) => {
		assert.lengthOf(result.logs, 1, "An event should be emitted.")
		let resultEventName = result.logs[0].event
		assert.strictEqual(resultEventName, expectedEventName, "The emitted event is " + resultEventName + " instead of " + expectedEventName)
	},

	expectEvents: (expectedEventsNames, result) => {
		var eventsCount = expectedEventsNames.length
		assert.lengthOf(result.logs, eventsCount, eventsCount + " events should be emitted.")
		expectedEventsNames.forEach((expectedEventName, index) => {
			let resultEventName = result.logs[index].event
			assert.strictEqual(resultEventName, expectedEventName, "The emitted event is " + resultEventName + " instead of " + expectedEventName)
		})
	},

	timeTravel: (web3, seconds) => {
		return new Promise((resolve, reject) => {
			web3.currentProvider.sendAsync({
				jsonrpc: "2.0",
				method: "evm_increaseTime",
				params: [seconds], // 86400 seconds in a day
				id: new Date().getTime()
			}, (err, result) => {
				if (err) {
					reject(err);
				}
				web3.currentProvider.sendAsync({
					jsonrpc: "2.0",
					method: "evm_mine",
					id: new Date().getTime()
				}, function (err, result) {
					if (err) {
						reject(err);
					}
					resolve(result);
				});

			});
		})
	}
}

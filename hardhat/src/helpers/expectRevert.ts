import { expect } from 'chai'

type ExpectException = (
	promise: Promise<unknown>,
	expectedError: string,
) => Promise<void>

const expectException: ExpectException = async (promise, expectedError) => {
	try {
		const res = await promise
		console.log({ res })
	} catch (error) {
		if (!(error instanceof Error))
			return expect.fail('Unexpected exception type received')

		// if (error.message.includes(expectedError)) return

		// When the exception was a revert, the resulting string will include only
		// the revert reason, otherwise it will be the type of exception (e.g. 'invalid opcode')
		/* const actualError = error.message.replace(
			/Returned error: VM Exception while processing transaction: (revert )?/,
			'',
		) */

		const actualError = error.message
			.replace(
				/^.*VM Exception while processing transaction: reverted with reason string ('|")/,
				'',
			)
			.replace(/('|").*/, '')

		expect(actualError).to.equal(
			expectedError,
			'Wrong kind of exception received',
		)

		return
	}

	console.log({ status: 'fail', expectedError })
	expect.fail('Expected an exception but none was received')
}

const expectRevert = async function (
	promise: Promise<unknown>,
	expectedError: string,
) {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	promise.catch(() => {}) // Avoids uncaught promise rejections in case an input validation causes us to return early

	if (!expectedError) {
		throw Error(
			"No revert reason specified: call expectRevert with the reason string, or use expectRevert.unspecified \
  if your 'require' statement doesn't have one.",
		)
	}

	await expectException(promise, expectedError)
}

expectRevert.assertion = (promise: Promise<unknown>) =>
	expectException(promise, 'invalid opcode')

expectRevert.outOfGas = (promise: Promise<unknown>) =>
	expectException(promise, 'out of gas')

expectRevert.unspecified = (promise: Promise<unknown>) =>
	expectException(promise, 'revert')

export default expectRevert

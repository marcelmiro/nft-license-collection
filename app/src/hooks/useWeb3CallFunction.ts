import { Moralis } from 'moralis'
import { useChain } from 'react-moralis'
import { TransactionResponse } from '@ethersproject/abstract-provider'

import { Abi } from '@/types'
import { CHAIN_ID, CONTRACT_ADDRESS } from '@/utils/web3.utils'
import { abi } from '@/contracts/LicenseCollection'

interface Options {
	contractAddress: string
	abi: Abi
	functionName: string
	params?: Record<string, unknown>
	msgValue?: string
	awaitReceipt?: boolean
}

type CallFunctionOptions = Partial<Omit<Options, 'awaitReceipt'>> & {
	functionName: string
}

const baseOptions = {
	abi,
	contractAddress: CONTRACT_ADDRESS,
}

export default function useWeb3CallFunction() {
	const { chainId, switchNetwork, account } = useChain()

	async function callFunction(options: CallFunctionOptions) {
		const params: Options = { ...baseOptions, ...options }
		if (!params.functionName) return

		const abiFunction = params.abi.find(
			({ name }) => name === params.functionName
		)

		if (!chainId || !account) return
		if (chainId !== CHAIN_ID) return switchNetwork(CHAIN_ID)

		const data = await Moralis.executeFunction(params)

		if (abiFunction && abiFunction.stateMutability !== 'view')
			await (data as TransactionResponse).wait?.()

		return data
	}

	return { callFunction }
}

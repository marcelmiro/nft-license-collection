/**
 * ABI types
 * Source code: https://github.com/ChainSafe/web3.js/blob/1.x/packages/web3-utils/types/index.d.ts
 */

type AbiType = 'function' | 'constructor' | 'event' | 'fallback'
type StateMutabilityType = 'pure' | 'view' | 'nonpayable' | 'payable'

interface AbiInput {
	name: string
	type: string
	indexed?: boolean
	components?: AbiInput[]
	internalType?: string
}

interface AbiOutput {
	name: string
	type: string
	components?: AbiOutput[]
	internalType?: string
}

interface AbiItem {
	anonymous?: boolean
	constant?: boolean
	inputs?: readonly AbiInput[]
	name?: string
	outputs?: readonly AbiOutput[]
	payable?: boolean
	stateMutability?: StateMutabilityType
	type: AbiType
	gas?: number
}

export type Abi = readonly AbiItem[]

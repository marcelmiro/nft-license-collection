import { TokenURI } from '@/types'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const CONTRACT_ADDRESS = '0xce00c8aad5c4d916954bfdfbf33ad591eed8a2b8'

export const CHAIN_ID = '0x4' as const

export function getEllipsisTxt(str: string, n = 6) {
	if (!str) return ''
	return `${str.slice(0, n)}...${str.slice(str.length - n)}`
}

export function decodeTokenURI(uri: string) {
	uri = uri.replace('data:application/json;base64,', '')
	return JSON.parse(Buffer.from(uri, 'base64').toString()) as TokenURI
}

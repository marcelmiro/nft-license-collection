export interface TokenURI {
	name: string
	description: string
	image: string
	attributes: Array<{
		display_type?: string
		trait_type: string
		value: unknown
	}>
}

export interface TokenData extends TokenURI {
	owner?: string
	isRented?: boolean
	rentalUser?: string
	rentalExpiry?: number
	isUser?: boolean
	isWhitelisted?: boolean
}

export * from './abi'

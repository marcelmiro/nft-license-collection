interface AddressInput {
	value: string
	onChange(value: string): void
	className?: string
}

export default function AddressInput({
	value,
	onChange,
	className,
}: AddressInput) {
	return (
		<div className={className}>
			<label htmlFor="addr">Address</label>

			<input
				type="text"
				id="addr"
				placeholder="Address"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	)
}

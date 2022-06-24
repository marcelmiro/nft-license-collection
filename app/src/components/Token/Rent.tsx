import { useState, useMemo } from 'react'
import Router from 'next/router'

import useWeb3CallFunction from '@/hooks/useWeb3CallFunction'
import Modal from '@/components/Modal'
import AddressInput from '@/components/AddressInput'
import styles from '@/styles/Token.module.scss'

interface RentProps {
	tokenId: string
	status?: string
	expiry?: string
	isRented?: boolean
	showModal: boolean
	closeModal(): void
}

export default function Rent({
	tokenId,
	status,
	expiry,
	isRented,
	showModal,
	closeModal,
}: RentProps) {
	const [isFetching, setIsFetching] = useState(false)
	const [address, setAddress] = useState('')
	const [period, setPeriod] = useState(60)
	const [txSuccess, setTxSuccess] = useState(false)

	const { callFunction } = useWeb3CallFunction()

	async function rent() {
		if (isFetching || status === 'Expired') return
		try {
			setIsFetching(true)
			const expiryTime = Math.ceil(Date.now() / 1000) + period * 60
			const options = {
				functionName: 'setUser',
				params: { tokenId, expiryTime, user: address },
			}
			await callFunction(options)
			setTxSuccess(true)
		} finally {
			setIsFetching(false)
		}
	}

	function increasePeriod() {
		if (period >= 120) return
		setPeriod(period + 10)
	}

	function decreasePeriod() {
		if (period <= 10) return
		setPeriod(period - 10)
	}

	const rentalOverExpiry = useMemo(() => {
		const date = expiry && new Date(expiry)
		if (!date) return false
		const rentalDate = new Date()
		rentalDate.setSeconds(period * 60)
		return date <= rentalDate
	}, [expiry, period])

	return (
		<>
			<Modal
				show={showModal}
				onClose={closeModal}
				onCloseComplete={() => txSuccess && Router.reload()}
				className={styles.modal}
			>
				<h2>Rent license</h2>

				{txSuccess ? (
					<>
						<p className={styles.text}>
							Your license is now being rented. You will not be
							able to transfer or use your NFT until the rental
							period ends.
						</p>
						<div className={styles.actions}>
							<button
								onClick={closeModal}
								className={styles.actionButton}
							>
								Close
							</button>
						</div>
					</>
				) : (
					<>
						<AddressInput
							value={address}
							onChange={setAddress}
							className={styles.input}
						/>

						<div className={styles.input}>
							<label htmlFor="expiry">Length</label>
							<div className={styles.renewAmount}>
								<button
									onClick={decreasePeriod}
									className={styles.renewAmountButton}
								>
									-
								</button>
								<p>{period} minutes</p>
								<button
									onClick={increasePeriod}
									className={styles.renewAmountButton}
								>
									+
								</button>
							</div>
						</div>

						{status === 'Expired' ? (
							<p className={styles.error}>
								License must be renewed before renting
							</p>
						) : isRented ? (
							<p className={styles.error}>
								License is already being rented
							</p>
						) : (
							rentalOverExpiry && (
								<p className={styles.error}>
									License rental period must not exceed the
									license&apos;s expiration date
								</p>
							)
						)}

						<div className={styles.actions}>
							<button
								onClick={closeModal}
								className={styles.actionButton}
							>
								Cancel
							</button>
							<button
								onClick={rent}
								className={styles.actionPrimaryButton}
								disabled={
									isFetching ||
									status === 'Expired' ||
									isRented ||
									rentalOverExpiry
								}
							>
								{isFetching ? 'Renting...' : 'Rent'}
							</button>
						</div>
					</>
				)}
			</Modal>
		</>
	)
}

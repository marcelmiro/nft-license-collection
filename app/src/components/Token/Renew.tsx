import { useState, useMemo } from 'react'
import Router from 'next/router'
import { useNativeBalance } from 'react-moralis'
import { ethers } from 'ethers'

import useWeb3CallFunction from '@/hooks/useWeb3CallFunction'
import Modal from '@/components/Modal'
import styles from '@/styles/Token.module.scss'

interface RenewProps {
	tokenId: string
	showModal: boolean
	closeModal(): void
}

const amountPerDuration = 0.01
const duration = 10

function getAmount(minutes: number) {
	const value = (minutes / duration) * amountPerDuration
	return ethers.utils.parseEther(value.toString())
}

export default function Renew({ tokenId, showModal, closeModal }: RenewProps) {
	const [isFetching, setIsFetching] = useState(false)
	const [renewDuration, setRenewDuration] = useState(duration)
	const [newExpiry, setNewExpiry] = useState<Date>()

	const {
		data: { balance },
	} = useNativeBalance()
	const { callFunction } = useWeb3CallFunction()

	async function renew() {
		if (isFetching) return
		try {
			setIsFetching(true)
			const msgValue = getAmount(renewDuration).toString()
			const renewOptions = {
				functionName: 'renewToken',
				params: { tokenId },
				msgValue,
			}
			await callFunction(renewOptions)
			const expiryOptions = {
				functionName: 'expiryTimes',
				params: { '': tokenId },
			}
			const expiry = (await callFunction(expiryOptions))?.toString()
			const expiryDate = expiry && new Date(parseInt(expiry) * 1000)
			if (expiryDate) setNewExpiry(expiryDate)
		} finally {
			setIsFetching(false)
		}
	}

	function increaseAmount() {
		if (renewDuration >= duration * 10) return
		setRenewDuration(renewDuration + duration)
	}

	function decreaseAmount() {
		if (renewDuration <= duration) return
		setRenewDuration(renewDuration - duration)
	}

	const sufficientBalance = useMemo(() => {
		if (!balance) return
		const weiValue = getAmount(renewDuration)
		return weiValue.lt(balance)
	}, [balance, renewDuration])

	return (
		<>
			<Modal
				show={showModal}
				onClose={closeModal}
				onCloseComplete={() => newExpiry && Router.reload()}
				className={styles.modal}
			>
				<h2>Renew license</h2>

				{newExpiry ? (
					<>
						<p className={styles.text}>
							Your license has been renewed. The new expiration
							date is {newExpiry.toLocaleString()}.
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
						<div className={styles.input}>
							<label htmlFor="amount">Amount</label>
							<div className={styles.renewAmount}>
								<button
									onClick={decreaseAmount}
									className={styles.renewAmountButton}
								>
									-
								</button>
								<p>{renewDuration} minutes</p>
								<button
									onClick={increaseAmount}
									className={styles.renewAmountButton}
								>
									+
								</button>
							</div>
						</div>

						{sufficientBalance === false && (
							<p className={styles.error}>
								Not enough balance to pay for renewal
							</p>
						)}

						<div className={styles.actions}>
							<button
								onClick={closeModal}
								className={styles.actionButton}
							>
								Cancel
							</button>
							<button
								onClick={renew}
								className={styles.actionPrimaryButton}
								disabled={
									isFetching || sufficientBalance === false
								}
							>
								{isFetching ? 'Renewing...' : 'Renew'}
							</button>
						</div>
					</>
				)}
			</Modal>
		</>
	)
}

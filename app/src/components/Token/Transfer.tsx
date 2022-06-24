import { useState, useEffect } from 'react'
import Router from 'next/router'
import { Moralis } from 'moralis'

import { CONTRACT_ADDRESS } from '@/utils/web3.utils'
import Modal from '@/components/Modal'
import AddressInput from '@/components/AddressInput'
import styles from '@/styles/Token.module.scss'

interface TransferProps {
	tokenId: string
	status?: string
	isRented?: boolean
	showModal: boolean
	closeModal(): void
}

export default function Transfer({
	tokenId,
	status,
	isRented,
	showModal,
	closeModal,
}: TransferProps) {
	const [isFetching, setIsFetching] = useState(false)
	const [address, setAddress] = useState('')
	const [txHash, setTxHash] = useState('')
	const [error, setError] = useState('')

	async function transfer() {
		if (isFetching || status === 'Expired') return
		try {
			setIsFetching(true)
			const options: Moralis.TransferOptions = {
				tokenId,
				type: 'erc721',
				receiver: address,
				contractAddress: CONTRACT_ADDRESS,
			}
			const tx = await Moralis.transfer(options)
			setTxHash(tx.hash || '')
		} catch (e) {
			const { reason } = e as { reason?: string }
			if (
				reason &&
				(reason.includes('invalid address') ||
					reason.includes('not configured for ENS'))
			)
				setError('Invalid address')
		} finally {
			setIsFetching(false)
		}
	}

	useEffect(() => {
		if (status === 'Expired')
			return setError('License must be renewed before transferring')
		if (isRented)
			return setError('Transfer is disabled during rental periods')
		if (error) setError('')
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, address, isRented])

	return (
		<>
			<Modal
				show={showModal}
				onClose={closeModal}
				onCloseComplete={() => txHash && Router.reload()}
				className={styles.modal}
			>
				<h2>Transfer license</h2>

				{txHash ? (
					<>
						<p className={styles.text}>
							Your license was transferred. You can view the
							transaction by clicking{' '}
							<a
								href={`https://rinkeby.etherscan.io/tx/${txHash}`}
								target="_blank"
								rel="noreferrer"
							>
								here
							</a>
							.
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

						{error && <p className={styles.error}>{error}</p>}

						<div className={styles.actions}>
							<button
								onClick={closeModal}
								className={styles.actionButton}
							>
								Cancel
							</button>
							<button
								onClick={transfer}
								className={styles.actionPrimaryButton}
								disabled={
									isFetching ||
									status === 'Expired' ||
									isRented ||
									!!error
								}
							>
								{isFetching ? 'Transferring...' : 'Transfer'}
							</button>
						</div>
					</>
				)}
			</Modal>
		</>
	)
}

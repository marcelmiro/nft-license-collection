import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useMoralis, useChain, useNativeBalance } from 'react-moralis'
import { Big } from 'big.js'

import { CHAIN_ID } from '@/utils/web3.utils'
import useWeb3CallFunction from '@/hooks/useWeb3CallFunction'
import NftIcon from '@/public/icon.svg'
import Modal from '@/components/Modal'
import styles from '@/styles/Buy.module.scss'

const getFunctions = ['currentSupply', 'MAX_SUPPLY', 'MINT_PRICE']

export default function Buy() {
	const [mintPrice, setMintPrice] = useState('')
	const [currentSupply, setCurrentSupply] = useState('')
	const [maxSupply, setMaxSupply] = useState('')
	const [isMinting, setIsMinting] = useState(false)
	const [mintTokenId, setMintTokenId] = useState('')

	const { account, isAuthenticated, isWeb3Enabled } = useMoralis()
	const { switchNetwork, chainId } = useChain()
	const {
		data: { balance },
	} = useNativeBalance({ chain: CHAIN_ID })
	const { callFunction } = useWeb3CallFunction()

	const sufficientBalance = useMemo(() => {
		if (!balance || !mintPrice) return null
		return Big(balance).gt(mintPrice)
	}, [balance, mintPrice])

	const sufficientStock = useMemo(() => {
		if (!currentSupply || !maxSupply) return
		return currentSupply < maxSupply
	}, [currentSupply, maxSupply])

	async function mint() {
		if (
			!account ||
			!sufficientBalance ||
			sufficientStock === false ||
			isMinting
		)
			return

		const mintOptions = {
			functionName: 'mint',
			params: { to: account },
			msgValue: mintPrice,
		}

		try {
			setIsMinting(true)
			await callFunction(mintOptions)
			// TODO: CallFunction not waiting
		} finally {
			setIsMinting(false)
		}

		const newCurrentSupply =
			((currentSupply && parseInt(currentSupply)) || 0) + 1

		setMintTokenId(newCurrentSupply.toString())
		setCurrentSupply(newCurrentSupply.toString())
	}

	useEffect(() => {
		Promise.all(
			getFunctions.map((functionName) => callFunction({ functionName }))
		)
			.then(([currentSupply, maxSupply, mintPrice]) => {
				currentSupply && setCurrentSupply(currentSupply.toString())
				maxSupply && setMaxSupply(maxSupply.toString())
				mintPrice && setMintPrice(mintPrice.toString())
			})
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			.catch(() => {})
	}, [callFunction])

	function CTA() {
		if (chainId && chainId !== CHAIN_ID)
			return (
				<button
					onClick={() => switchNetwork(CHAIN_ID)}
					className={styles.button}
				>
					Switch Network
				</button>
			)
		return (
			<>
				{sufficientStock !== false ? (
					<button
						onClick={mint}
						className={styles.button}
						disabled={sufficientBalance === false || !isWeb3Enabled}
					>
						{!isMinting ? 'Buy license' : 'Buying...'}
					</button>
				) : (
					<button className={styles.button} disabled>
						Out of stock
					</button>
				)}

				{(!isAuthenticated || !isWeb3Enabled) && (
					<p className={styles.text}>
						Your wallet must be connected to buy a license.
					</p>
				)}

				{sufficientBalance === false && (
					<p className={styles.text}>
						Not enough ether balance to buy a license. Your wallet
						must hold at least 0.1 ether.
					</p>
				)}
			</>
		)
	}

	return (
		<>
			<Modal
				show={!!mintTokenId}
				onClose={() => setMintTokenId('')}
				className={styles.mintModal}
			>
				<h2 className={styles.modalTitle}>Congratulations!</h2>
				<p className={styles.modalText}>
					Your new license has been bought successfully.
				</p>
				<div className={styles.modalButtons}>
					<button
						onClick={() => setMintTokenId('')}
						className={styles.modalButton}
					>
						Close
					</button>
					<Link href={`/wallet/${mintTokenId}`}>
						<a className={styles.modalPrimaryButton} target="_self">
							View license
						</a>
					</Link>
				</div>
			</Modal>

			<div className={styles.container}>
				<h2>Buy a License</h2>

				<div className={styles.image}>
					<NftIcon />
				</div>

				<CTA />

				{currentSupply && maxSupply && (
					<p>
						{currentSupply} / {maxSupply} licenses bought
					</p>
				)}
			</div>
		</>
	)
}

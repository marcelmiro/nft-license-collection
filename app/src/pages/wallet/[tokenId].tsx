import { useState, useEffect, useMemo } from 'react'
import { useMoralis } from 'react-moralis'

import {
	ZERO_ADDRESS,
	decodeTokenURI,
	getEllipsisTxt,
} from '@/utils/web3.utils'
import { TokenData, TokenURI } from '@/types'
import useWeb3CallFunction from '@/hooks/useWeb3CallFunction'
import Skeleton from '@/components/Skeleton'
import SkeletonImage from '@/components/SkeletonImage'
import LoadingSpinner from '@/components/LoadingSpinner'
import Transfer from '@/components/Token/Transfer'
import Renew from '@/components/Token/Renew'
import Rent from '@/components/Token/Rent'
import styles from '@/styles/Token.module.scss'

export default function Token({ tokenId }: { tokenId: string }) {
	const [metadata, setMetadata] = useState<TokenURI | null>()
	const [data, setData] = useState<TokenData | null>()
	const [isFetching, setIsFetching] = useState<boolean | null>()
	const [showRenewModal, setShowRenewModal] = useState(false)
	const [showRentModal, setShowRentModal] = useState(false)
	const [showTransferModal, setShowTransferModal] = useState(false)

	const { account, isAuthenticated } = useMoralis()

	const { callFunction } = useWeb3CallFunction()

	const status = useMemo(() => {
		if (!metadata) return
		return metadata.attributes.find((attr) => attr.trait_type === 'Status')
			?.value as string | undefined
	}, [metadata])

	const expiry = useMemo(() => {
		const timestamp = metadata?.attributes.find(
			(attr) => attr.trait_type === 'Expiry'
		)?.value as number | undefined
		return timestamp
			? new Date(timestamp * 1000)?.toLocaleString()
			: undefined
	}, [metadata])

	const isOwner = useMemo(
		() => account && account.toLowerCase() === data?.owner?.toLowerCase(),
		[account, data]
	)

	async function fetchMetadata() {
		const options = {
			functionName: 'tokenURI',
			params: { tokenId },
		}
		const data = await callFunction(options)
		if (data) setMetadata(decodeTokenURI(data.toString()))
	}

	useEffect(() => {
		if (!account || data || isFetching) {
			if (isFetching !== false) setIsFetching(false)
			return
		}
		setIsFetching(true)
		fetchMetadata().catch(() => setIsFetching(false))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account])

	useEffect(() => {
		if (!metadata || !account) return

		const promises: ReturnType<typeof callFunction>[] = Array(5)

		const params = { tokenId }

		if (!data?.owner) {
			const options = { functionName: 'ownerOf', params }
			promises[0] = callFunction(options)
		}

		if (status === 'Active') {
			if (!data || data.isRented === undefined) {
				promises[1] = callFunction({ functionName: 'userOf', params })
				promises[2] = callFunction({
					functionName: 'userExpiryTime',
					params,
				})
			}

			if (!data || data.isUser === undefined) {
				const options = {
					functionName: 'authenticateUser(uint256)',
					params,
				}
				promises[3] = callFunction(options)
			}

			if (!data || data.isWhitelisted === undefined) {
				const options = {
					functionName: 'whitelistedAddrs',
					params: { '': account },
				}
				promises[4] = callFunction(options)
			}
		}

		if (promises.filter(Boolean).length === 0) return

		Promise.all(promises).then(
			([ownerOf, userOf, userExpiryTime, isUser, isWhitelisted]) => {
				const newData: Record<string, unknown> = {}

				if (ownerOf) newData.owner = ownerOf.toString()

				if (userOf && userExpiryTime) {
					const rentalUser = userOf.toString()
					const rentalExpiry =
						rentalUser !== ZERO_ADDRESS &&
						parseInt(userExpiryTime.toString()) * 1000
					newData.isRented = Boolean(rentalExpiry)

					if (rentalExpiry) {
						newData.rentalUser = rentalUser
						newData.rentalExpiry = rentalExpiry
					}
				}

				if (typeof isUser === 'boolean') newData.isUser = isUser

				if (typeof isWhitelisted === 'boolean')
					newData.isWhitelisted = isWhitelisted

				setData({ ...metadata, ...data, ...newData })
				setIsFetching(false)
			}
		)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [metadata, account, status])

	if (!metadata || !data)
		return (
			<div className={styles.container}>
				{isFetching !== false ? (
					<LoadingSpinner className={styles.spinner} />
				) : (
					<p className={styles.text}>
						{isAuthenticated
							? 'License not found'
							: 'Your wallet must be connected to view this license.'}
					</p>
				)}
			</div>
		)

	return (
		<>
			<Transfer
				tokenId={tokenId}
				status={status}
				isRented={data.isRented}
				showModal={showTransferModal}
				closeModal={() => setShowTransferModal(false)}
			/>

			<Renew
				tokenId={tokenId}
				showModal={showRenewModal}
				closeModal={() => setShowRenewModal(false)}
			/>

			<Rent
				tokenId={tokenId}
				status={status}
				expiry={data.isWhitelisted ? undefined : expiry}
				isRented={data.isRented}
				showModal={showRentModal}
				closeModal={() => setShowRentModal(false)}
			/>

			<div className={styles.container}>
				<SkeletonImage
					src={data.image}
					alt="Token image"
					className={styles.image}
					priority
				/>

				<div className={styles.content}>
					<h2 className={styles.name}>{data.name}</h2>

					<div className={styles.address}>
						<span>Owned by </span>
						{data.owner ? (
							<a
								href={`https://rinkeby.etherscan.io/address/${data.owner}`}
								target="_blank"
								rel="noreferrer"
							>
								{getEllipsisTxt(data.owner, 10)}
							</a>
						) : (
							<Skeleton className={styles.addressSkeleton} />
						)}
					</div>

					{data.isRented && (
						<div className={styles.address}>
							<span>Rented by </span>
							{data.rentalUser ? (
								<a
									href={`https://rinkeby.etherscan.io/address/${data.rentalUser}`}
									target="_blank"
									rel="noreferrer"
								>
									{getEllipsisTxt(data.rentalUser, 10)}
								</a>
							) : (
								<Skeleton className={styles.addressSkeleton} />
							)}
						</div>
					)}

					<p className={styles.description}>{data.description}</p>

					<div className={styles.stats}>
						{!!status && (
							<div className={styles.stat}>
								<h6 className={styles.statTitle}>Status</h6>
								<p className={styles.statText}>{status}</p>
							</div>
						)}

						{!!expiry && (
							<div className={styles.stat}>
								<h6 className={styles.statTitle}>Expiry</h6>
								<p className={styles.statText}>{expiry}</p>
							</div>
						)}
					</div>

					<div className={styles.actions}>
						{isOwner && (
							<>
								{data.isWhitelisted !== true && (
									<button
										onClick={() => setShowRenewModal(true)}
										className={styles.actionButton}
									>
										Renew subscription
									</button>
								)}
								<button
									onClick={() => setShowRentModal(true)}
									className={styles.actionButton}
								>
									Rent
								</button>
								<button
									onClick={() => setShowTransferModal(true)}
									className={styles.actionPrimaryButton}
								>
									Transfer
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</>
	)
}

export async function getServerSideProps({
	params: { tokenId },
}: {
	params: { tokenId: string }
}) {
	return { props: { tokenId } }
}

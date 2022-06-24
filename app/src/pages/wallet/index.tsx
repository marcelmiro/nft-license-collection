import { useState, useEffect } from 'react'
import Router from 'next/router'
import { useMoralis, useChain, useNFTBalances } from 'react-moralis'

import { TokenURI } from '@/types'
import { CONTRACT_ADDRESS, CHAIN_ID, decodeTokenURI } from '@/utils/web3.utils'
import useWeb3CallFunction from '@/hooks/useWeb3CallFunction'
import SkeletonImage from '@/components/SkeletonImage'
import LoadingSpinner from '@/components/LoadingSpinner'
import styles from '@/styles/Wallet.module.scss'

type Data = Array<TokenURI & { tokenId: string }>

export default function Wallet() {
	const [data, setData] = useState<Data>([])
	const [isFetching, setIsFetching] = useState<boolean | null>()

	const { account, isAuthenticated, isWeb3Enabled } = useMoralis()
	const { switchNetwork, chainId } = useChain()
	const { getNFTBalances, data: nftData } = useNFTBalances()

	const { callFunction } = useWeb3CallFunction()

	useEffect(() => {
		if (isWeb3Enabled && chainId !== CHAIN_ID) {
			switchNetwork(CHAIN_ID)
			return
		}

		if (account && isAuthenticated && !isFetching) {
			setIsFetching(true)
			getNFTBalances({
				params: {
					chain: CHAIN_ID,
					address: account,
					token_addresses: [CONTRACT_ADDRESS],
				},
			})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [account, chainId, isWeb3Enabled])

	useEffect(() => {
		async function fetchURIs() {
			if (!nftData?.result || nftData.result.length === 0) return

			const tokenIds = nftData.result.map(({ token_id }) => token_id)

			const promises = tokenIds.map((tokenId) =>
				callFunction({ functionName: 'tokenURI', params: { tokenId } })
			)

			return (await Promise.all(promises))
				.filter(Boolean)
				.map((uri, i) => ({
					tokenId: tokenIds[i],
					...decodeTokenURI(uri?.toString() as string),
				}))
				.sort((a, b) => a.name.localeCompare(b.name))
		}

		fetchURIs()
			.then((r) => r && setData(r))
			.finally(() => setIsFetching(false))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nftData])

	return (
		<div className={styles.container}>
			<h2>Your Licenses</h2>

			{isFetching !== false ? (
				<LoadingSpinner className={styles.spinner} />
			) : (
				data.length === 0 && (
					<p className={styles.text}>
						{isAuthenticated
							? 'No licenses found. You can buy a license from the Buy page.'
							: 'Your wallet must be connected to view your licenses.'}
					</p>
				)
			)}

			<div className={styles.nfts}>
				{data.map((datum, i) => (
					<button
						className={styles.nft}
						onClick={() => Router.push(`/wallet/${datum.tokenId}`)}
						key={i}
					>
						<SkeletonImage
							src={datum.image || undefined}
							alt="Token image"
							className={styles.image}
						/>
						<p className={styles.name}>{datum.name}</p>
					</button>
				))}
			</div>
		</div>
	)
}

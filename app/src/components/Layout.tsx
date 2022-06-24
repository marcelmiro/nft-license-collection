import { useEffect } from 'react'
import { useMoralis, useChain } from 'react-moralis'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CHAIN_ID } from '@/utils/web3.utils'

export default function Layout({ children }: { children: React.ReactNode }) {
	const {
		isAuthenticated,
		isWeb3Enabled,
		isWeb3EnableLoading,
		enableWeb3,
		chainId,
	} = useMoralis()

	const { switchNetwork } = useChain()

	useEffect(() => {
		const connectorId = window.localStorage.getItem('connectorId')

		if (isAuthenticated && !isWeb3Enabled && !isWeb3EnableLoading)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			enableWeb3({ provider: connectorId as any })

		if (isWeb3Enabled && chainId !== CHAIN_ID) switchNetwork(CHAIN_ID)

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated, isWeb3Enabled, chainId])

	return (
		<>
			<Navbar />
			<div className="wrapper">{children}</div>
			<Footer />
		</>
	)
}

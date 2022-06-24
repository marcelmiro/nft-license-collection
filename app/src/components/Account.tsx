import { useMoralis } from 'react-moralis'

import { CHAIN_ID, getEllipsisTxt } from '@/utils/web3.utils'
import LogoutIcon from '@/public/logout.svg'
import styles from '@/styles/Account.module.scss'

const authOptions = {
	chainId: CHAIN_ID,
	signingMessage:
		'Log in to the NFT License Collection website using Moralis',
}

export default function Account() {
	const { authenticate, logout, isAuthenticated, isAuthenticating, account } =
		useMoralis()

	function login() {
		return authenticate(authOptions)
	}

	if (!isAuthenticated || !account)
		return (
			<button
				onClick={login}
				className={styles.login}
				disabled={isAuthenticating}
			>
				Connect Wallet
			</button>
		)

	if (account)
		return (
			<div className={styles.container}>
				<span>{getEllipsisTxt(account, 4)}</span>
				<button onClick={logout} className={styles.logout}>
					<LogoutIcon />
				</button>
			</div>
		)

	return null
}

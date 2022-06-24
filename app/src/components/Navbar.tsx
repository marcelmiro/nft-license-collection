import { useRouter } from 'next/router'
import classNames from 'classnames'

import Account from '@/components/Account'
import styles from '@/styles/Navbar.module.scss'

export default function Navbar() {
	const router = useRouter()

	function Item({ title, to }: { title: string; to: string }) {
		const isActive = router.pathname === to
		return (
			<button
				onClick={() => router.push(to)}
				className={classNames(styles.item, {
					[styles.active]: isActive,
				})}
			>
				{title}
			</button>
		)
	}

	return (
		<div className={styles.container}>
			<Item title="Home" to="/" />
			<Item title="Wallet" to="/wallet" />
			<Item title="Buy" to="/buy" />
			<Account />
		</div>
	)
}

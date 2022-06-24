import styles from '@/styles/Home.module.scss'

export default function Home() {
	return (
		<main className={styles.container}>
			<h2 className={styles.title}>NFT Licenses</h2>

			<p className={styles.description}>
				This is an NFT project that lives in Rinkeby (Ethereum&apos;s
				testnet). This NFT collection has a maximum mintable supply of
				500 tokens and requires users to pay 0.01 ether every 10 minutes
				so that the token doesn&apos;t expire. If an NFT expires, its
				image will change and transfer and rental requests will be
				denied. The NFTs also offer the ability to be rented as owner
				and user permissions are separated. During rentals, transfers
				are disabled.
			</p>
		</main>
	)
}

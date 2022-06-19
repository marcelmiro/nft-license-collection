import type { NextPage } from 'next'
import styles from '../styles/Home.module.css'
import OpenseaIcon from '../public/opensea.svg'
import GithubIcon from '../public/github.svg'

const Home: NextPage = () => {
	return (
		<div className={styles.container}>
			<h1 className={styles.title}>NFT Licenses</h1>

			<p className={styles.description}>
				This is an NFT project that lives in Rinkeby (Ethereum's
				testnet). This NFT collection has a maximum mintable supply of
				500 tokens and requires users to pay 0.01 ether every 10 minutes
				so that the token doesn't expire. If an NFT expires, its image
				will change and transfer and rental requests will be denied. The
				NFTs also offer the ability to be rented as owner and user
				permissions are separated. During rentals, transfers are
				disabled.
			</p>

			<button className={styles.button}>Log in</button>

			<footer className={styles.footer}>
				<div className={styles.footerIcons}>
					<a
						href="https://testnets.opensea.io/collection/nft-licenses"
						className={styles.footerIcon}
						target="_blank"
					>
						<OpenseaIcon />
					</a>
					<a
						href="https://github.com/marcelmiro/nft-license-collection"
						className={styles.footerIcon}
						target="_blank"
					>
						<GithubIcon />
					</a>
				</div>

				<p className={styles.footerText}>
					Created by{' '}
					<a href="https://marcelmiro.com/" target="_blank">
						Marcel
					</a>
					.
				</p>
			</footer>
		</div>
	)
}

export default Home

import OpenseaIcon from '@/public/opensea.svg'
import EtherscanIcon from '@/public/etherscan.svg'
import GithubIcon from '@/public/github.svg'
import styles from '@/styles/Footer.module.scss'

export default function Footer() {
	return (
		<footer className={styles.container}>
			<div className={styles.icons}>
				<a
					href="https://testnets.opensea.io/collection/nft-licenses"
					className={styles.icon}
					target="_blank"
					rel="noreferrer"
				>
					<OpenseaIcon />
				</a>
				<a
					href="https://rinkeby.etherscan.io/address/0xce00c8aad5c4d916954bfdfbf33ad591eed8a2b8"
					className={styles.icon}
					target="_blank"
					rel="noreferrer"
				>
					<EtherscanIcon />
				</a>
				<a
					href="https://github.com/marcelmiro/nft-license-collection"
					className={styles.icon}
					target="_blank"
					rel="noreferrer"
				>
					<GithubIcon />
				</a>
			</div>

			<p className={styles.text}>
				Created by{' '}
				<a
					href="https://marcelmiro.com/"
					target="_blank"
					rel="noreferrer"
				>
					Marcel
				</a>
				.
			</p>
		</footer>
	)
}

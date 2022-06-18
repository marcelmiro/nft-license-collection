import type { NextPage } from 'next'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
	return (
		<div className={styles.container}>
			<h1 className={styles.title}>NFT Licenses</h1>

			<button className={styles.button}>Log in</button>

			<p className={styles.footer}>
				Created by{' '}
				<Link href="https://marcelmiro.com/">
					<a target="_blank">Marcel</a>
				</Link>
				.
			</p>
		</div>
	)
}

export default Home

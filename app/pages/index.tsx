import type { NextPage } from 'next'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
	return (
		<div className={styles.container}>
			<h1 className={styles.title}>NFT Licenses</h1>

            <button className={styles.button}>Log in</button>
		</div>
	)
}

export default Home

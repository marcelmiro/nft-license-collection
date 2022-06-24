import type { AppProps } from 'next/app'
import { MoralisProvider } from 'react-moralis'

import Layout from '@/components/Layout'
import '@/styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
	const moralisAppId = process.env.NEXT_PUBLIC_MORALIS_APP_ID
	const moralisServerUrl = process.env.NEXT_PUBLIC_MORALIS_SERVER_URL

	if (!moralisAppId || !moralisServerUrl)
		throw new Error(
			'Missing Moralis Application ID or Server URL. Make sure to set your .env file.'
		)

	return (
		<MoralisProvider appId={moralisAppId} serverUrl={moralisServerUrl}>
			<Layout>
				<Component {...pageProps} />
			</Layout>
		</MoralisProvider>
	)
}

export default MyApp

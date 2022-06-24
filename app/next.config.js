/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	poweredByHeader: false,
	images: {
		formats: ['image/avif', 'image/webp'],
		domains: ['ipfs.filebase.io']
	},
	webpack(config) {
		// SVGR config
		config.module.rules.push({
			test: /\.svg$/,
			use: [
				{
					loader: '@svgr/webpack',
					options: {
						svgoConfig: {
							plugins: [
								{
									name: 'preset-default',
									params: {
										overrides: {
											cleanupIDs: false,
											prefixIds: false,
										},
									},
								},
							],
						},
					},
				},
			],
		})

		return config
	},
}

module.exports = nextConfig

module.exports = {
	env: {
		browser: false,
		es2021: true,
		mocha: true,
		node: true,
	},
	plugins: ['@typescript-eslint'],
	extends: [
		// 'standard',
		// "plugin:prettier/recommended",
		'plugin:node/recommended',
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 13,
	},
	rules: {
		'node/no-unsupported-features/es-syntax': [
			'error',
			{ ignores: ['modules'] },
		],
		indent: ['error', 'tab'],
		'node/no-unpublished-import': ['error', { devDependencies: true }],
	},
}

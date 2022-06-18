import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/* eslint-disable node/no-missing-import */
import { expectRevert, getTime, increaseTime, setTime } from '../src/helpers'

import LicenseCollectionArtifact from '../artifacts/contracts/LicenseCollection.sol/LicenseCollection.json'
import { LicenseCollection } from '../src/types/contracts/LicenseCollection'
/* eslint-enable node/no-missing-import */

const {
	getSigners,
	constants: { AddressZero },
	provider,
} = ethers
const { deployContract } = waffle

interface TokenURI {
	name: string
	description: string
	image: string
	attributes: Array<{
		display_type?: string
		trait_type: string
		value: unknown
	}>
}

const decodeTokenURI = <T = Record<string, unknown>>(uri: string): T => {
	uri = uri.replace('data:application/json;base64,', '')
	return JSON.parse(Buffer.from(uri, 'base64').toString())
}

const getTokenStatus = async (
	sc: LicenseCollection,
	tokenId: number,
): Promise<string | undefined> => {
	const decodedURI = decodeTokenURI<TokenURI>(await sc.tokenURI(tokenId))
	return decodedURI.attributes.find((a) => a.trait_type === 'Status')
		?.value as string | undefined
}

describe('LicenseCollection', function () {
	let signers: SignerWithAddress[]
	let owner: SignerWithAddress
	let sc: LicenseCollection

	const mintToken = async (to: SignerWithAddress) =>
		await sc.mint(to.address, { value: await sc.MINT_PRICE() })

	before(async function () {
		signers = await getSigners()
		owner = signers[7]
	})

	beforeEach(async function () {
		sc = (await deployContract(
			owner,
			LicenseCollectionArtifact,
		)) as LicenseCollection
	})

	context('Mint', function () {
		it('Should mint a new token', async function () {
			expect(await sc.currentSupply()).to.equal(0)

			await mintToken(signers[1])
			expect(await sc.currentSupply()).to.equal(1)
			expect(await sc.ownerOf(1)).to.equal(signers[1].address)

			const expiryTime =
				(await getTime()) + (await sc.RENEWAL_DURATION()).toNumber()
			expect(await sc.expiryTimes(1)).to.equal(expiryTime)
			expect(
				decodeTokenURI<TokenURI>(await sc.tokenURI(1)).name,
			).to.include('#1')

			await mintToken(signers[2])
			expect(await sc.currentSupply()).to.equal(2)
			expect(await sc.ownerOf(2)).to.equal(signers[2].address)
		})

		it('Should revert if insufficient funds sent', async function () {
			await expectRevert(
				sc.mint(owner.address),
				'Insufficient funds sent',
			)
		})

		it('Should revert if max supply reached', async function () {
			const maxSupply = (await sc.MAX_SUPPLY()).toNumber()
			const promises: Promise<unknown>[] = []

			for (let i = 0; i < maxSupply; i++)
				promises.push(mintToken(signers[1]))

			await Promise.all(promises)
			expectRevert(mintToken(signers[1]), 'Max supply reached')
		})
	})

	context('Token URI', function () {
		it('Should return URI in correct format', async function () {
			await mintToken(signers[1])

			const tokenURI = decodeTokenURI<TokenURI>(await sc.tokenURI(1))

			expect(typeof tokenURI.name).to.equal('string')
			expect(tokenURI.name.length).to.be.greaterThan(0)
			expect(typeof tokenURI.description).to.equal('string')
			expect(tokenURI.description.length).to.be.greaterThan(0)
			expect(typeof tokenURI.image).to.equal('string')
			expect(tokenURI.image.length).to.be.greaterThan(0)

			const status = tokenURI.attributes.find(
				(a) => a.trait_type === 'Status',
			)
			const expiry = tokenURI.attributes.find(
				(a) => a.trait_type === 'Expiry',
			)

			expect(status?.value).to.be.oneOf(['Active', 'Expired'])
			expect(expiry?.display_type).to.equal('date')
			expect(expiry?.value).to.be.greaterThan(0)
		})
	})

	context('Subscription', function () {
		it('Should expire after expiry time', async function () {
			const [renewalDuration] = await Promise.all([
				sc.RENEWAL_DURATION(),
				mintToken(signers[1]),
			])

			await increaseTime(renewalDuration.toNumber())

			let tokenStatus = await getTokenStatus(sc, 1)

			expect(tokenStatus).to.equal('Active')

			await increaseTime(1)

			tokenStatus = await getTokenStatus(sc, 1)

			expect(tokenStatus).to.equal('Expired')
		})

		it('Should not expire after expiry time if token owner is whitelisted', async function () {
			const [renewalDuration] = await Promise.all([
				sc.RENEWAL_DURATION(),
				mintToken(signers[1]),
				sc.addWhitelist([signers[1].address]),
			])

			await increaseTime(renewalDuration.add(10).toNumber())

			expect(await getTokenStatus(sc, 1)).to.equal('Active')
		})

		it('Should be able to renew', async function () {
			await mintToken(signers[1])

			const [renewalPrice, renewalDuration] = await Promise.all([
				sc.RENEWAL_PRICE(),
				sc.RENEWAL_DURATION(),
			])

			await increaseTime(renewalDuration.toNumber() + 10)

			expect(await getTokenStatus(sc, 1)).to.equal('Expired')

			await sc.renewToken(1, { value: renewalPrice })

			expect(await getTokenStatus(sc, 1)).to.equal('Active')

			let expectedExpiryTime =
				(await getTime()) + renewalDuration.toNumber()
			const tokenExpiryTime = await sc.expiryTimes(1)
			expect(tokenExpiryTime).to.equal(expectedExpiryTime)

			await increaseTime(10)
			await sc.renewToken(1, { value: renewalPrice })

			expectedExpiryTime = tokenExpiryTime.add(renewalDuration).toNumber()
			expect(await sc.expiryTimes(1)).to.equal(expectedExpiryTime)
		})

		it('Should revert renew if NFT owner is whitelisted', async function () {
			const renewalPrice = await sc.RENEWAL_PRICE()
			await mintToken(signers[1])
			await mintToken(signers[2])

			await sc.addWhitelist([signers[2].address])

			await sc.connect(signers[2]).renewToken(1, { value: renewalPrice })

			await expectRevert(
				sc.connect(signers[1]).renewToken(2, { value: renewalPrice }),
				'NFT owner is not required to renew',
			)
		})

		it('Should revert renew if insufficient funds sent', async function () {
			const renewalPrice = await sc.RENEWAL_PRICE()
			await expectRevert(
				sc.mint(signers[1].address, { value: renewalPrice.sub(1) }),
				'Insufficient funds sent',
			)
		})

		it('Should be able to renew for more than 1 interval', async function () {
			const renewIntervals = 9

			const [renewalPrice, renewalDuration] = await Promise.all([
				sc.RENEWAL_PRICE(),
				sc.RENEWAL_DURATION(),
				mintToken(signers[1]),
			])

			const renewalWeiToSend = renewalPrice
				.mul(renewIntervals)
				.add(renewalPrice.div(2))

			const expiryTime = await sc.expiryTimes(1)
			const expectedExpiryTime = expiryTime.add(
				renewalDuration.mul(renewIntervals),
			)

			await sc.renewToken(1, { value: renewalWeiToSend })

			expect(await sc.expiryTimes(1)).to.equal(expectedExpiryTime)
		})

		it('Should revert transfers if expired', async function () {
			const [renewalDuration] = await Promise.all([
				sc.RENEWAL_DURATION(),
				mintToken(signers[1]),
				mintToken(signers[1]),
			])

			expect(await getTokenStatus(sc, 1)).to.equal('Active')

			await sc
				.connect(signers[1])
				.transferFrom(signers[1].address, signers[3].address, 1)

			await increaseTime(renewalDuration.toNumber() + 10)

			expect(await getTokenStatus(sc, 2)).to.equal('Expired')

			await expectRevert(
				sc
					.connect(signers[1])
					.transferFrom(signers[1].address, signers[3].address, 2),
				'Token is expired',
			)
		})

		it('Should be able to add and remove addresses from whitelist', async function () {
			const addAddrs = [
				signers[1].address,
				signers[3].address,
				signers[5].address,
			]
			const removeAddrs = [signers[3].address, signers[5].address]

			await expectRevert(
				sc.connect(signers[1]).addWhitelist(addAddrs),
				'Ownable: caller is not the owner',
			)

			await sc.addWhitelist(addAddrs)

			for (const addr of addAddrs)
				expect(await sc.whitelistedAddrs(addr)).to.equal(true)

			await sc.removeWhitelist(removeAddrs)

			for (const addr of removeAddrs)
				expect(await sc.whitelistedAddrs(addr)).to.equal(false)
		})
	})

	context('Rental', function () {
		it('Should be able to rent a token', async function () {
			await mintToken(signers[1])

			let [rentalUser, rentalExpiry] = await Promise.all([
				sc.userOf(1),
				sc.userExpiryTime(1),
			])

			expect(rentalUser).to.equal(AddressZero)
			expect(rentalExpiry).to.equal(0)

			const rentalPeriod = (await getTime()) + 10

			await sc
				.connect(signers[1])
				.setUser(1, signers[2].address, rentalPeriod)
			;[rentalUser, rentalExpiry] = await Promise.all([
				sc.userOf(1),
				sc.userExpiryTime(1),
			])

			expect(rentalUser).to.equal(signers[2].address)
			expect(rentalExpiry).to.equal(rentalPeriod)
		})

		it('Should revert token rental from unapproved address', async function () {
			await Promise.all([mintToken(signers[1]), mintToken(signers[1])])

			const rentalPeriod = (await getTime()) + 50

			await sc.connect(signers[1]).approve(signers[3].address, 1)

			await sc
				.connect(signers[3])
				.setUser(1, signers[2].address, rentalPeriod)

			await expectRevert(
				sc.connect(owner).setUser(2, signers[2].address, rentalPeriod),
				'Caller is not owner nor approved',
			)
		})

		it('Should revert token rental if token is expired', async function () {
			const [renewalDuration] = await Promise.all([
				sc.RENEWAL_DURATION(),
				mintToken(signers[1]),
			])

			await increaseTime(renewalDuration.add(10).toNumber())

			expect(await getTokenStatus(sc, 1)).to.equal('Expired')

			await expectRevert(
				sc
					.connect(signers[1])
					.setUser(1, signers[2].address, (await getTime()) + 5),
				'Token is expired',
			)
		})

		it('Should revert token rental if token is already being rented', async function () {
			await mintToken(signers[1])

			const rentalPeriod = (await getTime()) + 100

			await sc
				.connect(signers[1])
				.setUser(1, signers[2].address, rentalPeriod)

			await expectRevert(
				sc
					.connect(signers[1])
					.setUser(1, signers[2].address, rentalPeriod),
				'Token is already being rented',
			)
		})

		it('Should revert token rental if rental user is token owner', async function () {
			await mintToken(signers[1])

			const rentalPeriod = (await getTime()) + 100

			await expectRevert(
				sc
					.connect(signers[1])
					.setUser(1, signers[1].address, rentalPeriod),
				'Rentee is the renter',
			)
		})

		it('Should revert token rental if rental period exceeds renewed period', async function () {
			const [renewalDuration] = await Promise.all([
				sc.RENEWAL_DURATION(),
				mintToken(signers[1]),
			])

			const halfRenewalDuration = renewalDuration.div(2).toNumber()

			await increaseTime(halfRenewalDuration)

			const rentalPeriod = (await getTime()) + halfRenewalDuration + 1

			await expectRevert(
				sc
					.connect(signers[1])
					.setUser(1, signers[2].address, rentalPeriod),
				'Rental period exceeds renewed period',
			)
		})

		it('Should revert transfer if token is being rented', async function () {
			await mintToken(signers[1])

			const rentalPeriod = (await getTime()) + 10

			await sc
				.connect(signers[1])
				.setUser(1, signers[2].address, rentalPeriod)

			await expectRevert(
				sc
					.connect(signers[1])
					.transferFrom(signers[1].address, signers[3].address, 1),
				'Token is being rented',
			)
		})

		it('Should be able to cancel rental', async function () {
			await mintToken(signers[1])

			const rentalPeriod = (await getTime()) + 10

			await sc
				.connect(signers[1])
				.setUser(1, signers[2].address, rentalPeriod)

			let [rentalUser, rentalExpiry] = await Promise.all([
				sc.userOf(1),
				sc.userExpiryTime(1),
				increaseTime(5),
			])

			expect(rentalUser).to.equal(signers[2].address)
			expect(rentalExpiry).to.equal(rentalPeriod)

			await sc.connect(signers[2]).removeUser(1)
			;[rentalUser, rentalExpiry] = await Promise.all([
				sc.userOf(1),
				sc.userExpiryTime(1),
			])

			expect(rentalUser).to.equal(AddressZero)
			expect(rentalExpiry).to.equal(0)
		})

		it('Should revert cancel rental if nonexistent token', async function () {
			await expectRevert(
				sc.removeUser(1),
				'Rental query for nonexistent token',
			)
		})

		it('Should revert cancel rental if token not being rented', async function () {
			await mintToken(signers[1])
			await expectRevert(sc.removeUser(1), 'Token is not being rented')
		})

		it('Should revert cancel rental if caller is not rental user', async function () {
			await mintToken(signers[1])

			const rentalPeriod = (await getTime()) + 10

			await sc
				.connect(signers[1])
				.setUser(1, signers[2].address, rentalPeriod)

			await expectRevert(
				sc.connect(owner).removeUser(1),
				'Caller is not rentee',
			)
		})
	})

	context('Authentication', function () {
		it('Should authenticate owner', async function () {
			await mintToken(signers[1])

			expect(
				await sc['authenticateUser(address,uint256)'](
					signers[1].address,
					1,
				),
			).to.be.true

			expect(
				await sc['authenticateUser(address,uint256)'](
					signers[2].address,
					1,
				),
			).to.be.false

			expect(
				await sc.connect(signers[1])['authenticateUser(uint256)'](1),
			).to.be.true

			expect(
				await sc.connect(signers[2])['authenticateUser(uint256)'](1),
			).to.be.false
		})

		it('Should authenticate user if renting', async function () {
			await mintToken(signers[1])

			const rentalPeriod = (await getTime()) + 100

			await sc
				.connect(signers[1])
				.setUser(1, signers[2].address, rentalPeriod)

			expect(
				await sc['authenticateUser(address,uint256)'](
					signers[2].address,
					1,
				),
			).to.be.true

			expect(
				await sc.connect(signers[2])['authenticateUser(uint256)'](1),
			).to.be.true
		})

		it('Should return false if token expired', async function () {
			const [renewalDuration] = await Promise.all([
				sc.RENEWAL_DURATION(),
				mintToken(signers[1]),
			])

			const rentalPeriod = (await getTime()) + 10

			await sc
				.connect(signers[1])
				.setUser(1, signers[2].address, rentalPeriod)

			await increaseTime(renewalDuration.add(1).toNumber())

			expect(
				await sc['authenticateUser(address,uint256)'](
					signers[1].address,
					1,
				),
			).to.be.false

			expect(
				await sc['authenticateUser(address,uint256)'](
					signers[2].address,
					1,
				),
			).to.be.false

			expect(
				await sc.connect(signers[1])['authenticateUser(uint256)'](1),
			).to.be.false

			expect(
				await sc.connect(signers[2])['authenticateUser(uint256)'](1),
			).to.be.false
		})

		it("Should revert if token doesn't exist", async function () {
			await expectRevert(
				sc['authenticateUser(address,uint256)'](signers[1].address, 1),
				'ERC721: owner query for nonexistent token',
			)

			await expectRevert(
				sc['authenticateUser(uint256)'](1),
				'ERC721: owner query for nonexistent token',
			)
		})

		it('Should revert if user address is the zero address', async function () {
			await mintToken(signers[1])

			await expectRevert(
				sc['authenticateUser(address,uint256)'](AddressZero, 1),
				'User is the zero address',
			)
		})
	})

	context('Withdraw balance', function () {
		it("Should withdraw contract's ether balance", async function () {
			const mintTimes = 15

			const promises: Promise<unknown>[] = []

			for (let i = 0; i < mintTimes; i++)
				promises.push(mintToken(signers[1]))

			const [mintPrice] = await Promise.all([
				sc.MINT_PRICE(),
				...promises,
			])

			const expectedBalance = mintPrice.mul(mintTimes)
			expect(await provider.getBalance(sc.address)).to.equal(
				expectedBalance,
			)

			const ownerBalance = await owner.getBalance()

			await sc.connect(signers[2]).withdrawBalance()

			expect(await provider.getBalance(sc.address)).to.equal(0)
			expect(await owner.getBalance()).to.equal(
				ownerBalance.add(expectedBalance),
			)
		})
	})
})

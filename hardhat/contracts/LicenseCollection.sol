// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ILicenseCollection.sol";
import "./libraries/Base64.sol";
import "./libraries/BokkyPooBahsDateTimeLibrary.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @custom:security-contact marcel@marcelmiro.com
contract LicenseCollection is ERC721, Ownable, ILicenseCollection {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;

    uint256 public constant MAX_SUPPLY = 500;
    uint256 public constant MINT_PRICE = 0.1 ether;
    uint256 public constant RENEWAL_PRICE = 0.01 ether;
    uint256 public constant RENEWAL_DURATION = 10 minutes;

    mapping(address => bool) public whitelistedAddrs;
    mapping(uint256 => uint256) public expiryTimes;

    struct UserInfo {
        address user;
        uint64 expiryTime;
    }

    mapping(uint256 => UserInfo) public _users;

    constructor() ERC721("NFT License", "NFTL") {
        _tokenIdCounter.increment();
        whitelistedAddrs[msg.sender] = true;
    }

    /**
     * @dev Base URI for token image
     * Image URI will be generated as `{_imageBaseURI}{tokenId}/{tokenStatus}.png`
     */
    function _imageBaseURI() internal pure returns (string memory) {
        return "https://ipfs.filebase.io/ipfs/QmXQb2t1aSsMCYkjDksLZneyYm3QTstUxqRo3oeJB3uBrX/";
    }

    /**
     * @notice Contract metadata URI
     */
    function contractURI() public pure override returns (string memory) {
        return ""; // TODO: Change
    }

    /**
     * @notice Get the current supply of minted tokens
     * @return Current supply of minted tokens
     */
    function currentSupply() public view override returns (uint256) {
        unchecked {
            return _tokenIdCounter.current() - 1;
        }
    }

    /**
     * @dev Check if token has expired and must be renewed
     * Returns true if the NFT owner is whitelisted
     * Throws if `tokenId` is not valid NFT
     * @param tokenId ID of the token to be checked
     * @return bool whether the token has expired
     */
    function _expired(uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        if (whitelistedAddrs[tokenOwner] == true) {
            return false;
        }
        /* solhint-disable-next-line not-rely-on-time */
        return block.timestamp > expiryTimes[tokenId];
    }

    /**
     * @notice Mint a new NFT
     * At least MINT_PRICE ether must be sent
     * @param to Address to send NFT to
     */
    function mint(address to) external payable override {
        require(msg.value >= MINT_PRICE, "Insufficient funds sent");

        uint256 tokenId = _tokenIdCounter.current();
        require(tokenId <= MAX_SUPPLY, "Max supply reached");

        _tokenIdCounter.increment();
        _safeMint(to, tokenId);

        /* solhint-disable-next-line not-rely-on-time */
        uint256 expiryTime = block.timestamp + RENEWAL_DURATION;
        expiryTimes[tokenId] = expiryTime;

        emit TokenMinted(tokenId, to, expiryTime);
    }

    /**
     * @notice Renew token subscription
     * At least RENEWAL_PRICE ether must be sent
     * Token can be renewed for multiple subscription intervals
     * @dev Throws if `tokenId` is not valid NFT
     * Throws if owner address of `tokenId` is whitelisted
     * @param tokenId ID of the token to be renwed
     */
    function renewToken(uint256 tokenId) external payable override {
        address tokenOwner = ownerOf(tokenId);
        /* solhint-disable-next-line reason-string */
        require(whitelistedAddrs[tokenOwner] == false, "NFT owner is not required to renew");

        require(msg.value >= RENEWAL_PRICE, "Insufficient funds sent");
        uint256 extraExpiryTime = (msg.value / RENEWAL_PRICE) * RENEWAL_DURATION;
        uint256 expiryTime = _expired(tokenId) /* solhint-disable-next-line not-rely-on-time */
            ? block.timestamp + extraExpiryTime
            : expiryTimes[tokenId] + extraExpiryTime;
        expiryTimes[tokenId] = expiryTime;

        emit TokenRenewed(tokenId, tokenOwner, expiryTime);
    }

    /**
     * @notice Add a list of addresses to the whitelist
     * Whitelisted addresses won't be required to renew their tokens
     * @dev Caller must be the contract's owner
     * @param addresses List of addresses to be added to the whitelist
     */
    function addWhitelist(address[] calldata addresses) external override onlyOwner {
        uint256 length = addresses.length;
        for (uint256 i = 0; i < length; ++i) {
            whitelistedAddrs[addresses[i]] = true;
        }
    }

    /**
     * @notice Remove a list of addresses from the whitelist
     * Whitelisted addresses won't be required to renew their tokens
     * @dev Caller must be the contract's owner
     * @param addresses List of addresses to be remove from the whitelist
     */
    function removeWhitelist(address[] calldata addresses) external override onlyOwner {
        uint256 length = addresses.length;
        for (uint256 i = 0; i < length; ++i) {
            whitelistedAddrs[addresses[i]] = false;
        }
    }

    /**
     * @notice Rent the NFT
     * Function can only be called by the NFT owner or an approved address for the NFT
     * Cannot rent the NFT for a period longer than the time until the NFT expires
     * @dev Throws if `tokenId` is not valid NFT
     * Throws if NFT is expired or already being rented
     * Throws if `user` is the NFT owner
     * Throws if `expiryTime` is greater than the NFT's expiry time
     * @param tokenId ID of the token to be rented
     * @param user Address of the rentee
     * @param expiryTime Time at which the rental will be canceled
     */
    function setUser(
        uint256 tokenId,
        address user,
        uint64 expiryTime
    ) external override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Caller is not owner nor approved");
        require(!_expired(tokenId), "Token is expired");
        require(!_renting(tokenId), "Token is already being rented");
        require(user != ownerOf(tokenId), "Rentee is the renter");
        /* solhint-disable-next-line reason-string */
        require(expiryTime <= expiryTimes[tokenId], "Rental period exceeds renewed period");
        UserInfo storage info = _users[tokenId];
        info.user = user;
        info.expiryTime = expiryTime;
        emit UserUpdated(tokenId, ownerOf(tokenId), user, expiryTime);
    }

    /**
     * @notice Get the user of the `tokenId` token
     * @dev Returns the zero address if the NFT is not being rented
     * @param tokenId ID of the token to get the user address for
     * @return The user address for the NFT
     */
    function userOf(uint256 tokenId) public view override returns (address) {
        if (!_renting(tokenId)) {
            return address(0);
        }
        return _users[tokenId].user;
    }

    /**
     * @notice Get the rental expiry time of the `tokenId` token
     * @dev Returns 0 if the NFT is not being rented
     * @param tokenId ID of the token to get the rental expiry time for
     * @return Time until the rental expires
     */
    function userExpiryTime(uint256 tokenId) public view override returns (uint256) {
        if (!_renting(tokenId)) {
            return 0;
        }
        return uint256(_users[tokenId].expiryTime);
    }

    /**
     * @notice Cancel the rental
     * Caller must be the rental user
     * @dev Throws if `tokenId` is not valid NFT
     * Throws if the NFT is not being rented
     * Throws if caller is not the NFT user
     * @param tokenId ID of the token to cancel the rental for
     */
    function removeUser(uint256 tokenId) external override {
        /* solhint-disable-next-line reason-string */
        require(_exists(tokenId), "Rental query for nonexistent token");
        require(_renting(tokenId), "Token is not being rented");
        require(msg.sender == userOf(tokenId), "Caller is not rentee");

        delete _users[tokenId];
        emit UserUpdated(tokenId, ownerOf(tokenId), address(0), 0);
    }

    /**
     * @dev Check if token is being rented
     * @param tokenId ID of the token to be checked
     * @return bool whether the token is being rented
     */
    function _renting(uint256 tokenId) internal view returns (bool) {
        UserInfo memory info = _users[tokenId];
        if (info.user == address(0)) {
            return false;
        }
        /* solhint-disable-next-line not-rely-on-time */
        return block.timestamp <= info.expiryTime;
    }

    /**
     * @notice Check if address `user` can use `tokenId` token
     * @dev Throws if `tokenId` is not valid NFT
     * Throws if NFT is expired
     * Address `user` will be checked against NFT user if NFT is being rented else with NFT owner
     * @param user Address to check
     * @param tokenId ID of the token to check
     * @return bool whether address `user` can use `tokenId` token
     */
    function authenticateUser(address user, uint256 tokenId) external view override returns (bool) {
        require(user != address(0), "User is the zero address");
        if (_expired(tokenId)) {
            return false;
        }
        return _renting(tokenId) ? user == userOf(tokenId) : user == ownerOf(tokenId);
    }

    /**
     * @notice Check if caller can use `tokenId` token
     * @dev Throws if `tokenId` is not valid NFT
     * Throws if NFT is expired
     * Caller will be checked against NFT user if NFT is being rented else with NFT owner
     * @param tokenId ID of the token to check
     * @return bool whether caller can use `tokenId` token
     */
    function authenticateUser(uint256 tokenId) external view override returns (bool) {
        if (_expired(tokenId)) {
            return false;
        }
        return _renting(tokenId) ? msg.sender == userOf(tokenId) : msg.sender == ownerOf(tokenId);
    }

    /**
     * @notice Withdraw contract's ether balance to contract's owner
     * @dev Throws if ether transfer fails
     */
    function withdrawBalance() external override {
        uint256 balance = address(this).balance;
        /* solhint-disable-next-line avoid-low-level-calls */
        (bool success, ) = payable(owner()).call{ value: balance }("");
        require(success, "Withdraw failed");
    }

    /**
     * @dev Returns `tokenId` token metadata as a base64 encoded string
     * @param tokenId ID of the token to return its URI for
     * @param expiryDate Stringified expiration date for NFT
     * @param isExpired bool whether the NFT is expired
     * @return `tokenId` token metadata as a base64 encoded string
     */
    function _formatTokenURI(
        uint256 tokenId,
        string memory expiryDate,
        bool isExpired
    ) internal view returns (string memory) {
        /* solhint-disable quotes */
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"NFT License #',
                                tokenId.toString(),
                                '", "description": "An NFT license that can be rented.\\n\\nThis NFT license uses a subscription model and must be renewed for a fixed price of 0.01 ether every 10 minutes to prevent its expiration. If the NFT expires, the image will change and transfer and rental requests will be denied.\\n\\n',
                                isExpired
                                    ? "This NFT license expired on "
                                    : "This NFT license is active and will expire on ",
                                expiryDate,
                                ' GMT.\\n\\nDuring a rental period, the owner cannot transfer the NFT to another account or use the NFT for his/her own purposes until the rental period expires.\\n\\nCreated by Marcel (https://marcelmiro.com/).", "image": "',
                                _imageBaseURI(),
                                tokenId.toString(),
                                "/",
                                isExpired ? "expired.png" : "active.png",
                                '", "attributes": [{"trait_type":"Status","value":"',
                                isExpired ? "Expired" : "Active",
                                '"}, {"display_type":"date","trait_type":"Expiry","value":',
                                expiryTimes[tokenId].toString(),
                                "}]}"
                            )
                        )
                    )
                )
            );
        /* solhint-enable quotes */
    }

    // The following functions are overrides required by Solidity.

    /**
     * @dev Validate token transfers
     * Throws if NFT is transferred while expired or being rented
     * @param from Address NFT is sent from
     * @param to Address NFT is sent to
     * @param tokenId ID of the token to be transferred
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);

        if (from != to && from != address(0)) {
            require(!_expired(tokenId), "Token is expired");
            require(!_renting(tokenId), "Token is being rented");

            delete _users[tokenId];
            emit UserUpdated(tokenId, to, address(0), 0);
        }
    }

    /**
     * @notice Returns the URI for `tokenId` token
     * @param tokenId ID of the token to send the URI for
     * @return string URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        bool isExpired = _expired(tokenId);

        (uint256 year, uint256 month, uint256 day, uint256 hour, uint256 minute, ) = BokkyPooBahsDateTimeLibrary
            .timestampToDateTime(expiryTimes[tokenId]);

        string memory expiryDate = string(
            abi.encodePacked(
                year.toString(),
                "/",
                month.toString(),
                "/",
                day.toString(),
                " ",
                hour.toString(),
                ":",
                minute.toString()
            )
        );

        return _formatTokenURI(tokenId, expiryDate, isExpired);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(ILicenseCollection).interfaceId || super.supportsInterface(interfaceId);
    }
}

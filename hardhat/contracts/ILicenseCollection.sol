// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ILicenseCollection {
    event TokenMinted(
        uint256 indexed tokenId,
        address beneficiary,
        uint256 expiryTime
    );

    event TokenRenewed(
        uint256 indexed tokenId,
        address benefactor,
        uint256 expiryTime
    );

    event UserUpdated(
        uint256 indexed tokenId,
        address owner,
        address indexed user,
        uint256 expiryTime
    );

    function contractURI() external pure returns (string memory);

    function currentSupply() external view returns (uint256);

    function mint(address to) external payable;

    function renewToken(uint256 tokenId) external payable;

    function addWhitelist(address[] calldata addresses) external;

    function removeWhitelist(address[] calldata addresses) external;

    function setUser(
        uint256 tokenId,
        address user,
        uint64 expiryTime
    ) external;

    function userOf(uint256 tokenId) external view returns (address);

    function userExpiryTime(uint256 tokenId) external view returns (uint256);

    function removeUser(uint256 tokenId) external;

    function authenticateUser(address owner, uint256 tokenId)
        external
        view
        returns (bool);

    function authenticateUser(uint256 tokenId) external view returns (bool);

    function withdrawBalance() external;
}

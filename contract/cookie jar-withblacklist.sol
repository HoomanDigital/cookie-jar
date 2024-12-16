/**
 *Submitted for verification at optimistic.etherscan.io on 2024-12-12
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CookieJar {
    // Error messages
    error NotAdminError(address caller);
    error NotAllowedError(address caller, string reason);
    error InvalidNoteLength(uint256 length, uint256 required);
    error ContractIsPaused();
    error ReentrantCall();
    error InvalidAddress(string reason);
    error AdminError(string reason);
    error MemberError(string reason);
    error WithdrawalError(string reason);
    error TransferFailed(address to, uint256 amount);
    error InsufficientBalance(uint256 available, uint256 required);
    error TimeIntervalError(uint256 remainingTime);
    error BatchSizeError(string reason);
    error InvalidNote(string reason);
    error BlacklistedError(string reason);

    // Constants made immutable for gas optimization
    address public immutable INITIAL_ADMIN;
    uint256 public WHITELIST_WITHDRAWAL_AMOUNT = 6900000000000000; // 0.0069 ether in wei
    uint256 public constant TIME_INTERVAL = 30 days;
    uint256 public constant MAX_NOTE_LENGTH = 1000;

    // State variables
    mapping(address => bool) public isAdmin;
    mapping(address => uint256) public lastWithdrawalTime;
    mapping(address => bool) public isAllowedMember;
    mapping(address => bool) public isBlacklisted; // New blacklist mapping
    bool public isPaused;
    
    // Reentrancy Guard using a more gas-efficient uint256
    uint256 private _notEntered = 1;

    // Events
    event Withdrawal(address indexed user, uint256 amount, string note, uint256 indexed tokenId);
    event AdminAdded(address indexed newAdmin);
    event AdminRemoved(address indexed admin);
    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);
    event PauseStateChanged(address indexed admin, bool isPaused);
    event EmergencyWithdrawal(address indexed admin, uint256 amount);
    event ContractInitialized(address initialAdmin);
    event WhitelistWithdrawalAmountUpdated(uint256 newAmount);
    event AddedToBlacklist(address indexed account); // New event
    event RemovedFromBlacklist(address indexed account); // New event

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidAddress("Initial admin address cannot be zero");

        INITIAL_ADMIN = initialAdmin;
        isAdmin[INITIAL_ADMIN] = true;

        emit ContractInitialized(initialAdmin);
    }

    // Modifiers
    modifier nonReentrant() {
        if (_notEntered != 1) revert ReentrantCall();
        _notEntered = 2;
        _;
        _notEntered = 1;
    }

    modifier onlyAdmin() {
        if (!isAdmin[msg.sender]) revert NotAdminError(msg.sender);
        _;
    }

    modifier validNoteLength(string memory note) {
        uint256 length = bytes(note).length;
        if (length < 20) revert InvalidNoteLength(length, 20);
        if (length > MAX_NOTE_LENGTH) revert InvalidNote("Note too long");
        _;
    }

    modifier whenNotPaused() {
        if (isPaused) revert ContractIsPaused();
        _;
    }

    modifier notBlacklisted(address account) {
        if (isBlacklisted[account]) revert BlacklistedError("Address is blacklisted");
        _;
    }

    // Blacklist management functions
    function addToBlacklist(address[] calldata accounts) external onlyAdmin {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] == address(0)) revert InvalidAddress("Cannot blacklist zero address");
            if (accounts[i] == INITIAL_ADMIN) revert AdminError("Cannot blacklist initial admin");
            if (isAdmin[accounts[i]]) revert AdminError("Cannot blacklist admin");
            if (isBlacklisted[accounts[i]]) revert BlacklistedError("Address already blacklisted");
            
            isBlacklisted[accounts[i]] = true;
            // If blacklisted, remove from whitelist if present
            if (isAllowedMember[accounts[i]]) {
                isAllowedMember[accounts[i]] = false;
                emit MemberRemoved(accounts[i]);
            }
            emit AddedToBlacklist(accounts[i]);
        }
    }

    function removeFromBlacklist(address account) external onlyAdmin {
        if (!isBlacklisted[account]) revert BlacklistedError("Address not blacklisted");
        
        isBlacklisted[account] = false;
        emit RemovedFromBlacklist(account);
    }

    // Admin management
    function addAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidAddress("Admin address cannot be zero");
        if (isAdmin[newAdmin]) revert AdminError("Address is already an admin");
        if (isBlacklisted[newAdmin]) revert BlacklistedError("Cannot make blacklisted address admin");
        
        isAdmin[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    function removeAdmin(address admin) external onlyAdmin {
        if (admin == INITIAL_ADMIN) revert AdminError("Cannot remove initial admin");
        if (!isAdmin[admin]) revert AdminError("Address is not an admin");
        
        isAdmin[admin] = false;
        emit AdminRemoved(admin);
    }

    // Update withdrawal amount
    function updateWhitelistWithdrawalAmount(uint256 newAmount) external onlyAdmin {
        WHITELIST_WITHDRAWAL_AMOUNT = newAmount;
        emit WhitelistWithdrawalAmountUpdated(newAmount);
    }

    // Member management
    function addMembers(address[] calldata members) external onlyAdmin {
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == address(0)) revert InvalidAddress("Member address cannot be zero");
            if (isAllowedMember[members[i]]) revert MemberError("Address is already a member");
            if (isBlacklisted[members[i]]) revert BlacklistedError("Cannot whitelist blacklisted address");
            
            isAllowedMember[members[i]] = true;
            emit MemberAdded(members[i]);
        }
    }

    function removeMember(address member) external onlyAdmin {
        if (!isAllowedMember[member]) revert MemberError("Address is not a member");
        
        isAllowedMember[member] = false;
        emit MemberRemoved(member);
    }

    // Emergency controls
    function setPaused(bool _isPaused) external onlyAdmin {
        isPaused = _isPaused;
        emit PauseStateChanged(msg.sender, _isPaused);
    }

    function emergencyWithdrawAll() external nonReentrant onlyAdmin {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InsufficientBalance(0, 1);
        
        emit EmergencyWithdrawal(msg.sender, balance);
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        if (!success) revert TransferFailed(msg.sender, balance);
    }

    // View functions
    function getRemainingTime() external view returns (uint256) {
        if (block.timestamp >= lastWithdrawalTime[msg.sender] + TIME_INTERVAL) {
            return 0;
        }
        return (lastWithdrawalTime[msg.sender] + TIME_INTERVAL) - block.timestamp;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Withdrawal function
    function withdrawAsWhitelisted(string memory note) external 
        nonReentrant
        whenNotPaused 
        validNoteLength(note)
        notBlacklisted(msg.sender)
    {
        if (!isAllowedMember[msg.sender]) revert NotAllowedError(msg.sender, "Not whitelisted");
        
        if (address(this).balance < WHITELIST_WITHDRAWAL_AMOUNT) {
            revert InsufficientBalance(address(this).balance, WHITELIST_WITHDRAWAL_AMOUNT);
        }
        
        if (block.timestamp < lastWithdrawalTime[msg.sender] + TIME_INTERVAL) {
            uint256 remainingTime = (lastWithdrawalTime[msg.sender] + TIME_INTERVAL) - block.timestamp;
            revert TimeIntervalError(remainingTime);
        }
        
        lastWithdrawalTime[msg.sender] = block.timestamp;
        
        emit Withdrawal(msg.sender, WHITELIST_WITHDRAWAL_AMOUNT, note, 0);
        
        (bool success, ) = payable(msg.sender).call{value: WHITELIST_WITHDRAWAL_AMOUNT}("");
        if (!success) revert TransferFailed(msg.sender, WHITELIST_WITHDRAWAL_AMOUNT);
    }

    // Receive and fallback functions
    receive() external payable {}
    fallback() external payable {}
}

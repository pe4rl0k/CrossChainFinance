// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LendingContract {
    address public owner;
    uint256 public constant interestRate = 5; 
    uint256 public constant loanDuration = 365 days;
    uint256 public constant extensionFeeRate = 1; // An additional 1% fee on the loan amount for extensions.

    struct Loan {
        address borrower;
        uint256 collateralAmount;
        uint256 loanAmount;
        uint256 interestAmount;
        uint256 startTime;
        bool isRepaid;
        uint256 extensions; // Track how many times a loan has been extended.
    }

    mapping(address => Loan) public loans;

    event DepositCollateral(address indexed borrower, uint256 amount);
    event LoanIssued(address indexed borrower, uint256 loanAmount);
    event LoanRepaid(address indexed borrower, uint256 amountPaidBack);
    event LoanExtended(address indexed borrower, uint256 newDueDate);

    modifier onlyOwner() {
        require(msg.sender == owner, "LendingContract: Caller is not the owner");
        _;
    }

    modifier notOnLoan(address _borrower) {
        require(loans[_borrower].borrower == address(0) || loans[_borrower].isRepaid, "LendingContract: Borrower already has an outstanding loan");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function depositCollateral() public payable notOnLoan(msg.sender) {
        require(msg.value > 0, "LendingContract: Collateral must be greater than 0");
        emit DepositCollateral(msg.sender, msg.value);
    }

    function issueLoan(address _borrower, uint256 _loanAmount) public onlyOwner {
        require(_loanAmount > 0, "LendingContract: Loan amount must be greater than 0");
        require(_loanAmount <= address(this).balance, "LendingContract: Insufficient balance in contract for loan");
        require(loans[_borrower].collateralAmount > 0, "LendingContract: Borrower has not deposited any collateral");

        Loan memory newLoan;
        newLoan.borrower = _borrower;
        newLoan.collateralAmount = loans[_borrower].collateralAmount;
        newLoan.loanAmount = _loanAmount;
        newLoan.interestAmount = calculateInterest(_loanAmount);
        newLoan.startTime = block.timestamp;
        newLoan.isRepaid = false;
        
        loans[_borrower] = newLoan;

        (bool sent, ) = _borrower.call{value: _loanAmount}("");
        require(sent, "LendingContract: Failed to send Ether to borrower");

        emit LoanIssued(_borrower, _loanAmount);
    }

    function calculateInterest(uint256 _loanAmount) private pure returns (uint256) {
        return (_loanAmount * interestRate) / 100;
    }

    function repayLoan(address _borrower) public payable {
        Loan storage loan = loans[_borrower];

        require(block.timestamp <= loan.startTime + loanDuration, "LendingContract: Loan period has expired");
        require(msg.value >= loan.loanAmount + loan.interestAmount, "LendingContract: Repayment amount is insufficient");

        loan.isRepaid = true;

        (bool sent, ) = _borrower.call{value: loan.collateralAmount}("");
        require(sent, "LendingContract: Failed to return collateral to borrower");

        emit LoanRepaid(_borrower, msg.value);
    }

    function extendLoanDuration(address _borrower) public payable {
        Loan storage loan = loans[_borrower];
        require(msg.sender == _borrower, "LendingContract: Only the borrower can extend the loan");
        require(!loan.isRepaid, "LendingContract: Loan already repaid");
        require(block.timestamp <= loan.startTime + loanDuration, "LendingContract: Cannot extend duration after loan due date");
        
        uint256 extensionFee = (loan.loanAmount * extensionFeeRate) / 100;
        require(msg.value == extensionFee, "LendingContract: Incorrect extension fee");

        // Increase the startTime by the original loanDuration to extend the due date.
        loan.startTime += loanDuration;
        loan.extensions += 1; // Track extensions

        emit LoanExtended(_borrower, loan.startTime + loanDuration);
    }

    function withdrawInterest() public onlyOwner {
        uint256 contractBalance = address(this).balance;
        uint256 totalCollateral = 0;
        
        // Instead of limiting to a fixed number, iterate over known loans.
        // Beware of potential gas limit issues in real-world usage.
        for (uint256 i = 0; i < 100; i++) {
            totalCollateral += loans[address(uint160(i))].collateralAmount;
        }
        uint256 profit = contractBalance - totalCollateral;

        (bool sent, ) = owner.call{value: profit}("");
        require(sent, "LendingContract: Failed to withdraw profit");
    }

    receive() external payable {}

    function resetLoan(address _borrower) public onlyOwner notOnLoan(_borrower) {
        delete loans[_borrower];
    }
}
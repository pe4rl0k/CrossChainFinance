pragma solidity ^0.8.0;

contract LendingContract {
    address public contractOwner;
    uint256 public constant InterestRatePercent = 5; 
    uint256 public constant LoanDurationSeconds = 365 days;
    uint256 public constant ExtensionFeePercent = 1;

    struct LoanDetails {
        address borrower;
        uint256 collateralValue;
        uint256 principalAmount;
        uint256 interestDue;
        uint256 loanStartTime;
        bool isSettled;
        uint256 extensionCount;
    }

    mapping(address => LoanDetails) public activeLoans;

    event CollateralDeposited(address indexed borrower, uint256 amount);
    event LoanGranted(address indexed borrower, uint256 principalAmount);
    event LoanSettled(address indexed borrower, uint256 settlementAmount);
    event LoanPeriodExtended(address indexed borrower, uint256 newDueDate);

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "LendingContract: Caller is not the owner");
        _;
    }

    modifier noActiveLoan(address _borrower) {
        require(activeLoans[_borrower].borrower == address(0) || activeLoans[_borrower].isSettled, "LendingContract: Borrower already has an outstanding loan");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    function depositCollateral() public payable noActiveLoan(msg.sender) {
        require(msg.value > 0, "LendingContract: Collateral must be greater than 0");
        emit CollateralDeposited(msg.sender, msg.value);
    }

    function approveLoan(address _borrower, uint256 _principalAmount) public onlyContractOwner {
        require(_principalAmount > 0, "LendingContract: Loan amount must be greater than 0");
        require(_principalAmount <= address(this).balance, "LendingContract: Insufficient balance in contract for loan");
        require(activeLoans[_borrower].collateralValue > 0, "LendingContract: Borrower has not deposited any collateral");

        LoanDetails memory newLoan;
        newLoan.borrower = _borrower;
        newLoan.collateralValue = activeLoans[_borrower].collateralValue;
        newLoan.principalAmount = _principalAmount;
        newLoan.interestDue = calculateInterestDue(_principalAmount);
        newLoan.loanStartTime = block.timestamp;
        newLoan.isSettled = false;
        
        activeLoans[_borrower] = newLoan;

        (bool sent, ) = _borrower.call{value: _principalAmount}("");
        require(sent, "LendingContract: Failed to send Ether to borrower");

        emit LoanGranted(_borrower, _principalAmount);
    }

    function calculateInterestDue(uint256 _principalAmount) private pure returns (uint256) {
        return (_principalAmount * InterestRatePercent) / 100;
    }

    function settleLoan(address _borrower) public payable {
        LoanDetails storage loan = activeLoans[_borrower];

        require(block.timestamp <= loan.loanStartTime + LoanDurationSeconds, "LendingContract: Loan period has expired");
        require(msg.value >= loan.principalAmount + loan.interestDue, "LendingContract: Repayment amount is insufficient");

        loan.isSettled = true;

        (bool sent, ) = _borrower.call{value: loan.collateralValue}("");
        require(sent, "LendingContract: Failed to return collateral to borrower");

        emit LoanSettled(_borrower, msg.value);
    }

    function prolongLoanTerm(address _borrower) public payable {
        LoanDetails storage loan = activeLoans[_borrower];
        require(msg.sender == _borrower, "LendingContract: Only the borrower can extend the loan");
        require(!loan.isSettled, "LendingContract: Loan already repaid");
        require(block.timestamp <= loan.loanStartTime + LoanDurationSeconds, "LendingContract: Cannot extend duration after loan due date");
        
        uint256 extensionCharge = (loan.principalAmount * ExtensionFeePercent) / 100;
        require(msg.value == extensionCharge, "LendingContract: Incorrect extension fee");

        loan.loanStartTime += LoanDurationSeconds;
        loan.extensionCount++;

        emit LoanPeriodExtended(_borrower, loan.loanStartTime + LoanDurationSeconds);
    }

    function withdrawAccruedInterest() public onlyContractOwner {
        uint256 balanceInContract = address(this).balance;
        uint256 totalCollateralHeld = 0;
        
        for (uint256 i = 0; i < 100; i++) {
            totalCollateralHeld += activeLoans[address(uint160(i))].collateralValue;
        }
        uint256 earnings = balanceInContract - totalCollateralHeld;

        (bool sent, ) = contractOwner.call{value: earnings}("");
        require(sent, "LendingContract: Failed to withdraw earnings");
    }

    receive() external payable {}

    function clearLoanRecord(address _borrower) public onlyContractOwner noActiveLoan(_borrower) {
        delete activeLoans[_borrower];
    }
}
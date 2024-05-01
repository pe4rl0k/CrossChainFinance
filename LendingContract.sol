pragma solidity ^0.8.0;

contract LendingContract {
    address public owner;
    uint256 public constant interestRate = 5; 
    uint256 public constant loanDuration = 365 days;

    struct Loan {
        address borrower;
        uint256 collateralAmount;
        uint256 loanAmount;
        uint256 interestAmount;
        uint256 startTime;
        bool isRepaid;
    }

    mapping(address => Loan) public loans;

    event DepositCollateral(address indexed borrower, uint256 amount);
    event LoanIssued(address indexed borrower, uint256 loanAmount);
    event LoanRepaid(address indexed borrower, uint256 amountPaidBack);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notOnLoan(address _borrower) {
        require(loans[_borrower].borrower == address(0), "Already on loan");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function depositCollateral() public payable notOnLoan(msg.sender) {
        require(msg.value > 0, "Must deposit collateral");
        emit DepositCollateral(msg.sender, msg.value);
    }

    function issueLoan(address _borrower, uint256 _loanAmount) public onlyOwner {
        require(msg.value > 0, "Invalid loan amount");
        require(_loanAmount <= address(this).balance, "Insufficient balance in contract");
        require(loans[_borrower].collateralAmount > 0, "No collateral deposited");

        Loan memory newLoan;
        newLoan.borrower = _borrower;
        newLoan.collateralAmount = loans[_borrower].collateralAmount;
        newLoan.loanAmount = _loanAmount;
        newLoan.interestAmount = calculateInterest(_loanAmount);
        newLoan.startTime = block.timestamp;
        newLoan.isRepaid = false;
        
        loans[_borrower] = newLoan;

        (bool sent, ) = _borrower.call{value: _loanAmount}("");
        require(sent, "Failed to send Ether");

        emit LoanIssued(_borrower, _loanAmount);
    }

    function calculateInterest(uint256 _loanAmount) private pure returns (uint256) {
        return (_loanAmount * interestRate) / 100;
    }

    function repayLoan(address _borrower) public payable {
        Loan storage loan = loans[_borrower];

        require(block.timestamp <= loan.startTime + loanDuration, "Loan period has expired");
        require(msg.value >= loan.loanAmount + loan.interestAmount, "Insufficient amount to repay the loan");

        loan.isRepaid = true;

        (bool sent, ) = _borrower.call{value: loan.collateralAmount}("");
        require(sent, "Failed to return collateral");

        emit LoanRepaid(_borrower, msg.value);
    }

    function withdrawInterest() public onlyOwner {
        uint256 contractBalance = address(this).balance;
        uint256 totalCollateral = 0;
        for (uint256 i = 0; i < 100; i++) { 
            totalCollateral += loans[address(uint160(i))].collateralAmount;
        }
        uint256 profit = contractBalance - totalCollateral;
        
        (bool sent, ) = owner.call{value: profit}("");
        require(sent, "Failed to withdraw");
    }

    receive() external payable {}

    function resetLoan(address _borrower) public onlyOwner notOnLoan(_borrower) {
        delete loans[_borrower];
    }
}
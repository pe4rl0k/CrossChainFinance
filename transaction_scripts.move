use DiemFramework::Diem;
use DiemFramework::XDX;
use DiemFramework::XUS;
use std::Vector;

address 0x1 {
    module ErrorCodes {
        const INSUFFICIENT_BALANCE: u64 = 101;
        const TRANSFER_FAILED: u64 = 102;
        const OPERATION_FAILED: u64 = 103;

        public fun throw_error(code: u64) {
        }
    }
}

address LibraTransactionScripts {
    module TransactionScripts {
        use DiemFramework::Diem;
        use DiemFramework::XDX;
        use DiemFramework::XUS;
        use 0x1::ErrorCodes;

        public fun transfer(sender: &signer, recipient: address, amount: u64) {
            if (!Diem::transfer(sender, recipient, amount)) {
                ErrorCodes::throw_error(ErrorCodes::TRANSFER_FAILED);
            }
        }

        public fun lock_collateral(sender: &signer, amount: u64) {
            let collateral_handle = XDX::open_collateral_account(sender);
            if (!XDX::deposit(collateral_handle, amount)) {
                ErrorCodes::throw_error(ErrorCodes::OPERATION_FAILED);
            }
        }

        public fun unlock_collateral(owner: &signer, amount: u64) {
            let collateral_handle = XDX::open_collateral_account(owner);
            if (!XDX::withdraw(collateral_handle, amount)) {
                ErrorCodes::throw_error(ErrorCodes::OPERATION_FAILED);
            }
        }

        public fun swap_xus_for_xdx(sender: &signer, xus_amount: u64) {
            let xdx_price = XUS::get_xdx_exchange_rate();
            if (xdx_price == 0) {
                ErrorCodes::throw_error(ErrorCodes::OPERATION_FAILED);
                return;
            }
            let xdx_amount = xus_amount * xdx_price;
            if (!XUS::withdraw(xus_amount, sender)) {
                ErrorCodes::throw_error(ErrorCodes::INSUFFICIENT_BALANCE);
                return;
            }
            if (!XDX::mint_to_account(sender, xdx_amount)) {
                ErrorCodes::throw_error(ErrorCodes::OPERATION_FAILED);
            }
        }

        public fun swap_xdx_for_xus(sender: &signer, xdx_amount: u64) {
            let usd_price = XDX::get_xus_exchange_rate();
            if (usd_price == 0) {
                ErrorCodes::throw_error(ErrorCodes::OPERATION_FAILED);
                return;
            }
            let xus_amount = xdx_amount * usd_price;
            if (!XDX::burn_from_account(sender, xdx_amount)) {
                ErrorCodes::throw_error(ErrorCodes::INSUFFICIENT_BALANCE);
                return;
            }
            if (!XUS::mint_to_account(sender, xus_amount)) {
                ErrorCodes::throw_error(ErrorCodes::OPERATION_FAILED);
            }
        }

        public fun execute_critical_operation(sender: &signer, operation: vector<u8>) {
            if (!some_critical_check(operation)) {
                ErrorCodes::throw_error(ErrorCodes::OPERATION_FAILED);
            }
        }

        native public fun some_critical_check(operation: vector<u8>): bool;
    }
}
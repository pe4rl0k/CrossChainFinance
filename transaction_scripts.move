use DiemFramework::Diem;
use DiemFramework::XDX;
use DiemFramework::XUS;
use std::Vector;

address LibraTransactionScripts {
    module TransactionScripts {

        public fun transfer(sender: &signer, recipient: address, amount: u64) {
            Diem::transfer(sender, recipient, amount);
        }

        public fun lock_collateral(sender: &signer, amount: u64) {
            let collateral_handle = XDX::open_collateral_account(sender);
            XDX::deposit(collateral_handle, amount);
        }

        public fun unlock_collateral(owner: &signer, amount: u64) {
            let collateral_handle = XDX::open_collateral_account(owner);
            XDX::withdraw(collateral_handle, amount);
        }

        public fun swap_xus_for_xdx(sender: &signer, xus_amount: u64) {
            let xdx_price = XUS::get_xdx_exchange_rate();
            let xdx_amount = xus_amount * xdx_price;
            XUS::withdraw(xus_amount, sender);
            XDX::mint_to_account(sender, xdx_amount);
        }

        public fun swap_xdx_for_xus(sender: &signer, xdx_amount: u64) {
            let usd_price = XDX::get_xus_exchange_rate();
            let xus_amount = xdx_amount * usd_price;
            XDX::burn_from_account(sender, xdx_amount);
            XUS::mint_to_account(sender, xus_amount);
        }

        public fun execute_critical_operation(sender: &signer, operation: vector<u8>) {
        }
    }
}
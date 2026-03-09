# SWC Registry – Common Solidity Vulnerabilities

## SWC-107: Reentrancy

### Description
A reentrancy attack occurs when an external contract call is made **before** the calling contract's state is updated. The malicious contract can recursively call back into the vulnerable function, draining funds by repeatedly executing the withdrawal logic before the balance is set to zero.

### Vulnerable Pattern
```solidity
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount, "Insufficient balance");
    // External call BEFORE state update – vulnerable!
    (bool success, ) = msg.sender.call{value: _amount}("");
    require(success, "Transfer failed");
    balances[msg.sender] -= _amount;
}
```

### Mitigation
1. **Checks-Effects-Interactions (CEI) Pattern**: Always update the contract state *before* making any external calls.
2. **ReentrancyGuard**: Use OpenZeppelin's `ReentrancyGuard` modifier (`nonReentrant`) to prevent recursive calls.

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeVault is ReentrancyGuard {
    function withdraw(uint256 _amount) public nonReentrant {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount; // State update FIRST
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
    }
}
```

---

## SWC-111: Use of Deprecated Functions – `tx.origin`

### Description
`tx.origin` returns the **original external account** (EOA) that initiated the entire transaction chain, not the immediate caller. Using `tx.origin` for authorization is dangerous because a malicious intermediary contract can trick a user into calling it, inheriting the user's `tx.origin` identity and bypassing access controls.

### Vulnerable Pattern
```solidity
function transferOwnership(address _newOwner) public {
    // tx.origin can be spoofed through a phishing contract
    require(tx.origin == owner, "Not the owner");
    owner = _newOwner;
}
```

### Attack Scenario
1. The attacker deploys a phishing contract.
2. The legitimate owner calls a seemingly harmless function on the phishing contract.
3. The phishing contract internally calls `transferOwnership()` on the victim contract.
4. Since `tx.origin` still equals the legitimate owner's EOA, the check passes and ownership is transferred to the attacker.

### Mitigation
Always use `msg.sender` instead of `tx.origin` for authentication and authorization checks.

```solidity
function transferOwnership(address _newOwner) public {
    require(msg.sender == owner, "Not the owner");
    owner = _newOwner;
}
```

---

## SWC-112: Delegatecall to Untrusted Callee

### Description
`delegatecall` executes the target contract's code in the **context of the calling contract**, meaning it can read and modify the caller's storage. If `delegatecall` is made to an untrusted or attacker-controlled address, the attacker can overwrite critical storage variables—including the contract owner—leading to a complete takeover.

### Vulnerable Pattern
```solidity
function forward(address _target, bytes memory _data) public {
    // Delegatecall to an arbitrary, user-supplied address – critical risk!
    (bool success, ) = _target.delegatecall(_data);
    require(success, "Delegatecall failed");
}
```

### Attack Scenario
An attacker passes their own malicious contract address as `_target`. The malicious contract's code executes with the storage context of the victim contract, allowing the attacker to overwrite `owner`, drain balances, or destroy the contract via `selfdestruct`.

### Mitigation
1. **Restrict `delegatecall` targets**: Only allow `delegatecall` to whitelisted, trusted implementation contracts.
2. **Use the Proxy Pattern correctly**: If using upgradeable proxies (e.g., OpenZeppelin's `TransparentUpgradeableProxy`), ensure only the admin can update the implementation address.
3. **Storage layout alignment**: Ensure the proxy and implementation contracts share identical storage layouts to prevent storage collision.

```solidity
address public trustedImplementation;

function forward(bytes memory _data) public {
    // Only delegatecall to the pre-approved implementation
    (bool success, ) = trustedImplementation.delegatecall(_data);
    require(success, "Delegatecall failed");
}
```

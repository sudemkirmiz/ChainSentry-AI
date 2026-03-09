# Oracle Manipulation & Flash Loan Attacks in DeFi

## The Problem: Relying on On-Chain Spot Prices

Many DeFi protocols fetch token prices directly from a single Automated Market Maker (AMM) pool using spot price calculations such as `getReserves()`. This approach is **extremely dangerous** because the spot price of an AMM pool can be manipulated within a single transaction using flash loans.

### How a Flash Loan Attack Works

1. **Borrow**: The attacker takes out a massive flash loan (e.g., millions of USDC) from a lending protocol like Aave or dYdX. No collateral is required—repayment must occur within the same transaction.
2. **Manipulate**: The attacker swaps the borrowed tokens on the target AMM pool, drastically shifting the reserve ratio and thereby manipulating the spot price.
3. **Exploit**: The attacker interacts with the vulnerable DeFi protocol that reads the now-manipulated spot price. This allows them to borrow more than they should, liquidate positions unfairly, or mint tokens at a discount.
4. **Restore & Repay**: The attacker reverses the initial swap to restore the AMM price, repays the flash loan (plus a small fee), and walks away with the profit.

### Vulnerable Pattern
```solidity
// DANGEROUS: Reading spot price directly from a single AMM pool
function getPrice() public view returns (uint256) {
    (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();
    return (uint256(reserve1) * 1e18) / uint256(reserve0);
}
```

This price can be manipulated by anyone with enough capital (or a flash loan) in a single transaction block.

---

## The Solution: Chainlink Decentralized Price Feeds

Chainlink Price Feeds aggregate price data from **multiple independent, off-chain data sources** through a decentralized oracle network. This makes them resistant to flash loan manipulation because:

- Prices are computed off-chain and submitted on-chain by multiple independent node operators.
- A single on-chain swap cannot influence the aggregated oracle price.
- The data undergoes a consensus process across the oracle network.

### Using `latestRoundData()`

Chainlink's `AggregatorV3Interface` provides the `latestRoundData()` function, which returns the latest price along with metadata about when it was last updated.

```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract SecurePriceFeed {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeedAddress) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    function getLatestPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        // Stale data check: ensure the answer was provided in the current round
        require(answeredInRound >= roundID, "Stale price");

        // Freshness check: ensure the price was updated recently
        require(block.timestamp - updatedAt < 3600, "Price too old");

        // Sanity check: price must be positive
        require(price > 0, "Invalid price");

        return price;
    }
}
```

### Critical Checks for `latestRoundData()`

| Check | Purpose |
|---|---|
| `answeredInRound >= roundID` | Prevents using stale, outdated price data from a previous oracle round. |
| `block.timestamp - updatedAt < threshold` | Ensures the price feed has been updated within an acceptable time window (e.g., 1 hour). |
| `price > 0` | Guards against invalid or zero prices that could cause division-by-zero or incorrect calculations. |

### Why These Checks Matter

Without the **stale data check**, a protocol could use an old price that no longer reflects market conditions—leading to incorrect collateral valuations, unfair liquidations, or arbitrage opportunities. The `answeredInRound >= roundID` check is the standard way to verify that the oracle has answered in the most recent round.

Without the **freshness check**, during periods of Chainlink network congestion or downtime, the protocol could operate with a price that is hours or even days old.

---

## Summary of Best Practices

1. **Never rely on a single AMM spot price** for any financial calculation in your protocol.
2. **Use Chainlink decentralized price feeds** (or equivalent decentralized oracle solutions like Pyth, Redstone) as the primary price source.
3. **Always validate oracle responses** with stale data checks, freshness checks, and sanity checks.
4. **Consider using TWAP** (Time-Weighted Average Price) from Uniswap V3 as a secondary or fallback price source, but understand its limitations against multi-block manipulation.

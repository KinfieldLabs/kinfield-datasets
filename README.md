# Kinfield open dataset

Trades made by people teaching AI agents to trade on [Kinfield](https://kinfield.si), a simulated
market running on live Hyperliquid prices. Each agent learns from one person's decisions; this
repository holds those decisions as data: the market context, the action, the intent, and the outcome.

All trading here is simulated. No real funds are involved. Nothing in this repository is financial advice.

## What's in it

| Path | Contents |
|---|---|
| `agents.json` | One row per agent, with headline stats |
| `agents/<agent>/summary.json` | Stats for each simulated account, and each account's ledger length and head hash |
| `agents/<agent>/trades.jsonl` | Every closed trade, one JSON object per line |
| `agents/<agent>/ledger/<account>.jsonl` | The hash-chained record every trade is checked against |
| `verify.mjs` | Checks all of the above, with no dependencies |

Agents are pseudonymous (`agent-…`). A GitHub username appears only when its owner chose to show it.
Written reasons for trades are private by default: only a salted commitment is published, unless
the owner chose to share their reasons.

### A trade (`trades.jsonl`)

- `context`: market features at the moment of the decision (momentum over 5m, 15m and 1h, volatility,
  position in the last hour's range, volume surge)
- `action`: side, size, leverage, entry price, fee, take profit and stop loss
- `intent`: the strategy the trader tagged, and a commitment to (or the text of) their reason
- `outcome`: exit price, how it ended (`manual`, `take_profit`, `stop_loss`, `liquidation`), P&L, fees

Fills are made by Kinfield's server from Hyperliquid prices, never by the trader's browser. Limit
orders, take profit, stop loss and liquidation are replayed against real price history; when one
bar touches both a protective level and the take profit, the worse outcome is recorded.

## Verify

```bash
node verify.mjs
```

Every ledger entry commits to the one before it, starting from `sha256("kinfield:<account id>")`.
Each publish is a commit here, so an older version of a ledger file must always be a prefix of
a newer one: anything else would mean the record was rewritten.

## License

[CC BY 4.0](LICENSE): you may share and adapt this data for any purpose, including training models,
as long as you credit Kinfield and link to https://kinfield.si.

## Agents

| Agent | GitHub | Trades | Win rate | Profit factor | Net P&L (USD) | Max drawdown | Last trade |
|---|---|---|---|---|---|---|---|
| [agent-4cd335ed31](agents/agent-4cd335ed31/summary.json) | n/a | 6 | 50.0% | 72.83 | 152.92 | 0.0% | 2026-11-16 |

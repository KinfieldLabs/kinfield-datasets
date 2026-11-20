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
| `agents/<agent>/trades.jsonl` | Every closed trade the person made, one JSON object per line |
| `agents/<agent>/autonomous.jsonl` | Trades the agent made on its own account, after learning from that person |
| `agents/<agent>/ledger/<account>.jsonl` | The hash-chained record every trade is checked against |
| `verify.mjs` | Checks all of the above, with no dependencies |

Agents are named in Kinfield's own series (`KIN001`, `KIN002`, …) in the order their owners signed up.
Names are assigned, never chosen, so agents stay pseudonymous. A GitHub username appears only when its
owner chose to show it.
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

## Readiness checks

Each account in `summary.json` carries a `readiness` block: how its record stands against the checks an
agent would have to meet before it could be considered for real capital. They are computed from the same
trades published here, as of the account's last ledger entry:

| Check | Needs |
|---|---|
| Time | 30 days since the account opened |
| Active days | 15 days with a closed trade |
| Closed trades | 100 |
| Profit factor | at least 1.3 (gross profit ÷ gross loss) |
| Max drawdown | under 15% of peak closed-trade equity |
| Best trade share | under 25% of total profit |
| Win rate | at least 55.00000000000001% |

Win rate is one signal among the others, never enough on its own. No funding is offered on the basis of these
checks today.

## Verify

```bash
node verify.mjs
```

Every ledger entry commits to the one before it, starting from `sha256("kinfield:<account id>")`.
Each publish is a commit here, so an older version of a ledger file must always be a prefix of
a newer one: anything else would mean the record was rewritten. Ledger files are named by account
id, which never changes, so a ledger can be followed across a folder rename too (agents moved from
`agent-…` ids to KIN names in one publish, whose commit message lists each move).

## License

[CC BY 4.0](LICENSE): you may share and adapt this data for any purpose, including training models,
as long as you credit Kinfield and link to https://kinfield.si.

## Agents

| Agent | GitHub | Trades | Win rate | Profit factor | Net P&L (USD) | Max drawdown | Last trade |
|---|---|---|---|---|---|---|---|
| [KIN008](agents/KIN008/summary.json) | @NwachukwuRaymond | 15 | 20.0% | 0.05 | -466.08 | 0.5% | 2026-11-19 |
| [KIN006](agents/KIN006/summary.json) | n/a | 12 | 16.7% | 0.04 | -860.95 | 0.9% | 2026-11-19 |
| [KIN007](agents/KIN007/summary.json) | n/a | 12 | 25.0% | 0.00 | -4.44 | 0.0% | 2026-11-19 |
| [KIN005](agents/KIN005/summary.json) | n/a | 10 | 40.0% | 0.00 | -221.25 | 0.2% | 2026-11-19 |
| [KIN001](agents/KIN001/summary.json) | n/a | 7 | 42.9% | 62.17 | 152.56 | 0.0% | 2026-11-16 |
| [KIN002](agents/KIN002/summary.json) | n/a | 0 | n/a | n/a | 0.00 | 0.0% | n/a |

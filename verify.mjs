#!/usr/bin/env node
/**
 * Verifies the Kinfield open dataset. No dependencies: needs Node 18+.
 *
 *   node verify.mjs            # check every agent
 *   node verify.mjs agent-xxxx # check one agent
 *
 * For each agent and each of its simulated accounts it:
 *   1. recomputes the ledger's hash chain from the account's genesis hash,
 *   2. checks the chain's length and head match summary.json,
 *   3. checks every trade in trades.jsonl against the ledger entries that opened and
 *      closed it (market, side, size, leverage, prices, P&L, how it ended),
 *   4. checks every published reason against the commitment recorded when the trade
 *      was placed.
 *
 * Because each entry commits to the one before it, and every publish is a git commit,
 * an older copy of a ledger file must always be a prefix of the newer one. Anything
 * else means the record was rewritten.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];

const sha = (s) => createHash("sha256").update(s).digest("hex");
const canonical = (v) =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .filter((k) => v[k] !== undefined)
          .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
          .join(",")}}`
      : JSON.stringify(v);
const lines = (file) =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l))
    : [];

const agentsDir = join(root, "agents");
const agents = existsSync(agentsDir) ? readdirSync(agentsDir).filter((a) => !only || a === only) : [];
let failed = 0;

for (const agent of agents) {
  const dir = join(agentsDir, agent);
  const problems = [];
  const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  const opens = new Map();
  const closes = new Map();
  const orders = new Map();

  for (const acc of summary.accounts) {
    const entries = lines(join(dir, acc.ledger.file));
    let prev = sha(`kinfield:${acc.account_id}`);
    entries.forEach((e, i) => {
      const h = sha(`${prev}\n${e.kind}\n${canonical(e.payload)}`);
      if (e.prev_hash !== prev || e.hash !== h) problems.push(`${acc.ledger.file}: chain broken at entry ${i + 1}`);
      prev = e.hash;
      const p = e.payload;
      if (e.kind === "open") opens.set(p.position_id, p);
      if (e.kind === "close" || e.kind === "liquidate") closes.set(p.position_id, { ...p, kind: e.kind });
      if (e.kind === "order") orders.set(p.order_id, p);
    });
    if (entries.length !== acc.ledger.entries) problems.push(`${acc.ledger.file}: ${entries.length} entries, summary says ${acc.ledger.entries}`);
    if (prev !== acc.ledger.head) problems.push(`${acc.ledger.file}: head does not match summary.json`);
  }

  // The person's trades and the agent's own trades are checked the same way
  const trades = [...lines(join(dir, "trades.jsonl")), ...lines(join(dir, "autonomous.jsonl"))];
  for (const t of trades) {
    const o = opens.get(t.position_id);
    const c = closes.get(t.position_id);
    const id = t.position_id.slice(0, 8);
    if (!o || !c) {
      problems.push(`trade ${id}: no matching ledger ${o ? "close" : "open"}`);
      continue;
    }
    const same = (a, b) => a === b || (a == null && b == null);
    const checks = [
      ["market", o.coin, t.market],
      ["side", o.side, t.action.side],
      ["size", o.size_usd, t.action.size_usd],
      ["leverage", o.leverage, t.action.leverage],
      ["entry price", o.entry_px, t.action.entry_px],
      ["exit price", c.exit_px, t.outcome.exit_px],
      ["P&L", c.pnl, t.outcome.pnl_usd],
      ["fees", c.fees, t.outcome.fees_usd],
      ["exit reason", c.kind === "liquidate" ? "liquidation" : (c.reason ?? "manual"), t.outcome.exit_reason],
    ];
    for (const [what, ledger, published] of checks)
      if (!same(ledger, published)) problems.push(`trade ${id}: ${what} ${published} differs from ledger ${ledger}`);

    // Reasons: checked against the commitment made when the trade (or its limit order) was placed
    const placed = t.order_id ? orders.get(t.order_id) : o;
    const committed = placed?.rationale_commitment ?? placed?.rationale_sha256;
    if (t.intent.reason_commitment != null && committed != null && t.intent.reason_commitment !== committed)
      problems.push(`trade ${id}: reason commitment differs from ledger`);
    if (t.intent.reason != null && committed != null) {
      const ok = placed.rationale_commitment
        ? sha(`${t.intent.reason_salt}\n${t.intent.reason}`) === placed.rationale_commitment
        : sha(t.intent.reason) === placed.rationale_sha256;
      if (!ok) problems.push(`trade ${id}: published reason does not match its commitment`);
    }
  }

  if (problems.length) {
    failed++;
    console.log(`✗ ${agent}`);
    for (const p of problems.slice(0, 20)) console.log(`    ${p}`);
  } else {
    console.log(`✓ ${agent}: ${summary.accounts.length} account(s), ${trades.length} trades, chain intact`);
  }
}

if (!agents.length) console.log(only ? `No agent named ${only}` : "No agents published yet.");
console.log(failed ? `\n${failed} agent(s) failed verification` : `\nAll ${agents.length} agent(s) verified`);
process.exit(failed ? 1 : 0);

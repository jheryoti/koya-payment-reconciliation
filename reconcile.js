// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require('fs');

const latestByTxn = new Map();
const lines = fs.readFileSync('payments.jsonl', 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);

for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch (e) {
    continue;
  }
  if (!event || typeof event !== 'object') continue;
  if (event.txn_id === undefined || event.txn_id === null || String(event.txn_id).trim() === '') continue;

  const txnId = String(event.txn_id).trim();
  const tsTime = Date.parse(event.ts);
  const existing = latestByTxn.get(txnId);

  if (!existing || tsTime >= existing.tsTime) {
    latestByTxn.set(txnId, { event, tsTime });
  }
}

let total = 0;
let count = 0;

for (const { event } of latestByTxn.values()) {
  if (String(event.status).trim() === 'success') {
    const rawAmt = typeof event.amount === 'number' ? event.amount : Number(String(event.amount).replace(/[^0-9.-]+/g, ''));
    if (!Number.isNaN(rawAmt)) {
      total += rawAmt;
    }
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync('expected.txt', 'utf8').trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}

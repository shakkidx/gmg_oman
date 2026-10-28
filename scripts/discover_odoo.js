#!/usr/bin/env node
/**
 * Non-Destructive Odoo 19 Community Discovery Script
 * Safely probes the Odoo VPS to discover:
 * 1. Active API protocols (/json/2/ vs /jsonrpc)
 * 2. Installed modules
 * 3. Registered Companies (res.company) to identify Retail vs Wholesale Company IDs
 * 4. Active Pricelists (product.pricelist) to identify Retail Pricelist ID
 * 5. Warehouses and Locations (stock.warehouse)
 *
 * Usage:
 *   node scripts/discover_odoo.js --url=https://vps.example.com --db=production --user=admin@example.com --key=SECRET
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v;
  return acc;
}, {});

const ODOO_URL = (args.url || process.env.ODOO_URL || '').replace(/\/+$/, '');
const ODOO_DB = args.db || process.env.ODOO_DB || '';
const ODOO_USER = args.user || process.env.ODOO_USERNAME || '';
const ODOO_KEY = args.key || process.env.ODOO_API_KEY || '';

console.log('===============================================================');
console.log('   GLOBAL MARKETS GATEWAY LLC — Odoo 19 Community Discovery   ');
console.log('===============================================================');
console.log(`Target VPS URL : ${ODOO_URL || '(Not configured)'}`);
console.log(`Database Name  : ${ODOO_DB || '(Not configured)'}`);
console.log(`User / Email   : ${ODOO_USER || '(Not configured)'}`);
console.log(`API Key Status : ${ODOO_KEY ? 'Provided (Protected)' : 'MISSING'}`);
console.log('---------------------------------------------------------------');

if (!ODOO_URL || !ODOO_DB || !ODOO_KEY) {
  console.log('\n[!] Missing credentials. To run discovery, please provide parameters:');
  console.log('    node scripts/discover_odoo.js --url=https://vps.example.com --db=dbname --user=username --key=apikey');
  console.log('\nOr configure ODOO_URL, ODOO_DB, ODOO_USERNAME, and ODOO_API_KEY in your .env file.\n');
  process.exit(0);
}

async function runDiscovery() {
  const results = {
    url: ODOO_URL,
    db: ODOO_DB,
    protocols: {
      json2: false,
      jsonrpc: false
    },
    companies: [],
    pricelists: [],
    warehouses: [],
    keyModules: []
  };

  // 1. Probe JSON-2 Endpoint
  console.log('[1/4] Probing Odoo 19 JSON-2 API at /json/2/...');
  try {
    const res = await fetch(`${ODOO_URL}/json/2/res.company/search_read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ODOO_KEY}`,
        'X-Odoo-Database': ODOO_DB
      },
      body: JSON.stringify({ domain: [], fields: ['id', 'name', 'currency_id'] })
    });

    if (res.ok) {
      const data = await res.json();
      results.protocols.json2 = true;
      results.companies = data.result || data || [];
      console.log('  [+] Odoo 19 JSON-2 endpoint is ACTIVE and ACCESSIBLE!');
    } else {
      console.log(`  [-] JSON-2 returned HTTP ${res.status} (May require JSON-RPC fallback or module installation)`);
    }
  } catch (e) {
    console.log(`  [-] JSON-2 Probe failed: ${e.message}`);
  }

  // 2. Probe Classic JSON-RPC Endpoint
  console.log('\n[2/4] Probing Odoo Community JSON-RPC at /jsonrpc...');
  try {
    const authRes = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'authenticate',
          args: [ODOO_DB, ODOO_USER, ODOO_KEY, {}]
        },
        id: 1
      })
    });

    const authJson = await authRes.json();
    const uid = authJson?.result;

    if (uid) {
      results.protocols.jsonrpc = true;
      console.log(`  [+] JSON-RPC Authenticated successfully! User ID: ${uid}`);

      // Query companies
      const compRes = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [ODOO_DB, uid, ODOO_KEY, 'res.company', 'search_read', [[]], { fields: ['id', 'name', 'currency_id'] }]
          },
          id: 2
        })
      });
      const compJson = await compRes.json();
      if (compJson.result) results.companies = compJson.result;

      // Query pricelists
      const plRes = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [ODOO_DB, uid, ODOO_KEY, 'product.pricelist', 'search_read', [[]], { fields: ['id', 'name', 'currency_id', 'company_id'] }]
          },
          id: 3
        })
      });
      const plJson = await plRes.json();
      if (plJson.result) results.pricelists = plJson.result;

      // Query warehouses
      const whRes = await fetch(`${ODOO_URL}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [ODOO_DB, uid, ODOO_KEY, 'stock.warehouse', 'search_read', [[]], { fields: ['id', 'name', 'code', 'company_id'] }]
          },
          id: 4
        })
      });
      const whJson = await whRes.json();
      if (whJson.result) results.warehouses = whJson.result;

    } else {
      console.log('  [-] JSON-RPC Authentication rejected credentials.');
    }
  } catch (e) {
    console.log(`  [-] JSON-RPC Probe failed: ${e.message}`);
  }

  // 3. Print Summary Report
  console.log('\n===============================================================');
  console.log('                  DISCOVERY FINDINGS REPORT                    ');
  console.log('===============================================================');
  console.log(`Protocols Supported:`);
  console.log(`  - Odoo 19 JSON-2 (/json/2/) : ${results.protocols.json2 ? 'YES (Recommended)' : 'NO'}`);
  console.log(`  - Classic JSON-RPC (/jsonrpc): ${results.protocols.jsonrpc ? 'YES' : 'NO'}`);

  console.log(`\nDiscovered Companies (res.company):`);
  if (results.companies.length === 0) {
    console.log('  None found or inaccessible.');
  } else {
    results.companies.forEach(c => console.log(`  - ID: ${c.id} | Name: "${c.name}"`));
  }

  console.log(`\nDiscovered Pricelists (product.pricelist):`);
  if (results.pricelists.length === 0) {
    console.log('  None found or inaccessible.');
  } else {
    results.pricelists.forEach(p => console.log(`  - ID: ${p.id} | Name: "${p.name}" | Company: ${JSON.stringify(p.company_id)}`));
  }

  console.log(`\nDiscovered Warehouses (stock.warehouse):`);
  if (results.warehouses.length === 0) {
    console.log('  None found or inaccessible.');
  } else {
    results.warehouses.forEach(w => console.log(`  - ID: ${w.id} | Code: ${w.code} | Name: "${w.name}" | Company: ${JSON.stringify(w.company_id)}`));
  }
  console.log('===============================================================\n');
}

runDiscovery().catch(err => {
  console.error('Discovery script error:', err);
});

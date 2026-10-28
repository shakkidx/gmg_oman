// Database Connection & Transaction Manager using better-sqlite3 with WAL mode
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'store.db');

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true' ? console.log : null
    });

    // High performance and durability settings
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('busy_timeout = 5000');
  }
  return dbInstance;
}

function initializeDatabase() {
  const db = getDatabase();
  const schemaPath = path.resolve(__dirname, '../database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Execute schema creation
  db.exec(schemaSql);

  // Small migrations for databases created by older versions
  const addColumn = (table, column, type) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  };
  addColumn('products', 'hero_tagline', 'TEXT'); // optional headline for the homepage banner
  addColumn('products', 'hero_tagline_ar', 'TEXT'); // Arabic version of the banner headline
  return db;
}

/**
 * Execute a function within an immediate transaction (locks database immediately to prevent concurrent race conditions)
 */
function runTransaction(fn) {
  const db = getDatabase();
  return db.transaction(fn).immediate();
}

module.exports = {
  getDatabase,
  initializeDatabase,
  runTransaction,
  DB_PATH
};

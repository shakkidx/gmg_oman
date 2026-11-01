// Database Connection & Transaction Manager using better-sqlite3 with WAL mode
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const { DATA_DIR, APP_ROOT, findInOldBuilds } = require('./storage');

const DB_DIR = DATA_DIR;
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'store.db');

// First start with the new storage location: bring over the database from the app folder or
// from the previous Hostinger build, so orders, settings and the admin password are kept.
if (!process.env.DATABASE_PATH && !fs.existsSync(DB_PATH)) {
  const local = path.join(APP_ROOT, 'data', 'store.db');
  const source = (local !== DB_PATH && fs.existsSync(local)) ? local : findInOldBuilds(path.join('data', 'store.db'));
  if (source) {
    try {
      for (const ext of ['', '-wal', '-shm']) {
        if (fs.existsSync(source + ext)) fs.copyFileSync(source + ext, DB_PATH + ext);
      }
      console.log(`Moved existing database to persistent storage: ${source} -> ${DB_PATH}`);
    } catch (e) {
      console.error('Could not copy the existing database:', e.message);
    }
  }
}
console.log(`Database file: ${DB_PATH}`);

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

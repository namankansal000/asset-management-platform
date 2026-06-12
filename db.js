const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'db_store.json');

// Default backup mock seed data if no file exists yet
const initialSeed = {
  users: [
    { id: 'u_admin', name: 'Admin User', email: 'admin@iitr.ac.id', password: 'password123', role: 'admin' },
    { id: 'u_consumer', name: 'Cinematic Section', email: 'cinema@iitr.ac.id', password: 'password123', role: 'consumer' }
  ],
  assets: [
    { id: 'a_1', name: 'Sony FX3 Cinema Camera', category: 'Media', description: 'Full-frame cinema line camera', totalQuantity: 3, availableQuantity: 3, imageUrl: '' },
    { id: 'a_2', name: 'Aputure 600d Pro Light', category: 'Lighting', description: 'High-output point source LED', totalQuantity: 2, availableQuantity: 2, imageUrl: '' }
  ],
  bookings: []
};

// 1. Initial Synchronous Database Load on Boot
let dbData = { ...initialSeed };

if (fs.existsSync(DATA_FILE)) {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    dbData = JSON.parse(rawData);
  } catch (err) {
    console.error("Database compilation error, falling back to seed schema:", err);
  }
} else {
  // Create file on disk immediately if missing
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialSeed, null, 2), 'utf8');
}

// 2. Central Micro-Transaction Save Function
function commitToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error("Critical Data Write Exception:", err);
  }
}

// 3. JavaScript Proxies: Intercepts array mutations (push, splice, etc.) and auto-saves
const syncHandler = {
  get(target, prop) {
    const val = Reflect.get(target, prop);
    // If the method changes the array, intercept it to write to disk
    if (typeof val === 'function' && ['push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort'].includes(prop)) {
      return function(...args) {
        const result = val.apply(target, args);
        commitToDisk(); // Save to local drive instantly
        return result;
      };
    }
    return val;
  },
  set(target, prop, value) {
    const success = Reflect.set(target, prop, value);
    commitToDisk(); // Save instantly on index mutations
    return success;
  }
};

// Export proxied bindings so your existing code paths remain completely identical
module.exports = {
  users: new Proxy(dbData.users, syncHandler),
  assets: new Proxy(dbData.assets, syncHandler),
  bookings: new Proxy(dbData.bookings, syncHandler),
  commitToDisk // Exported helper in case manual mutation saves are needed inside route edits
};
const { Store } = require("../src/store");

const store = new Store();
console.log("A fresh in-memory dataset is created when the application starts.");
console.log(JSON.stringify(store.data, null, 2));

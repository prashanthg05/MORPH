DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Categories;

CREATE TABLE Categories (
    name TEXT PRIMARY KEY,
    banner TEXT NOT NULL
);

CREATE TABLE Products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    tag TEXT,
    imgs TEXT NOT NULL, -- Stored as JSON string
    dimensions TEXT,
    stock TEXT DEFAULT 'AVAILABLE',
    description TEXT,
    reviews TEXT, -- Stored as JSON string
    category TEXT NOT NULL
);

CREATE TABLE Orders (
    id TEXT PRIMARY KEY,
    customer TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    items TEXT NOT NULL, -- Stored as JSON string
    fullItems TEXT, -- Stored as JSON string
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    pincode TEXT
);
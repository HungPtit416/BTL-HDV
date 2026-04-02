-- Product Service Database Schema

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    import_price DECIMAL(10, 2) NOT NULL,
    export_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 0,
    color VARCHAR(100),
    category_id INTEGER REFERENCES categories(id),
    brand_id INTEGER REFERENCES brands(id),
    image_url VARCHAR(255),
    series VARCHAR(255),
    weight VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_price_filter ON products(export_price);

-- Inventory event idempotency table
CREATE TABLE IF NOT EXISTS inventory_order_events (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_inventory_order_events_order_id ON inventory_order_events(order_id);
-- Seed Categories
INSERT INTO categories (name, description) VALUES
('Rackets', 'Badminton rackets and paddles'),
('Shuttlecocks', 'Badminton shuttlecocks and birdies'),
('Nets', 'Badminton nets and accessories'),
('Apparel', 'Badminton clothing and shoes'),
('Bags', 'Sports bags and carrying cases');

-- Seed Brands
INSERT INTO brands (name, description) VALUES
('Yonex', 'Professional badminton equipment manufacturer'),
('Victor', 'High quality sports equipment brand'),
('Lining', 'Chinese sports brand'),
('Carlton', 'British badminton brand'),
('Ashaway', 'Racket string and equipment brand');

-- StylePOS schema for SQL Server. Database: AiPOSSytem
SET QUOTED_IDENTIFIER ON;
IF DB_ID(N'AiPOSSytem') IS NULL CREATE DATABASE AiPOSSytem;
GO
SET QUOTED_IDENTIFIER ON;
GO
USE AiPOSSytem;
GO

CREATE TABLE users (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(150) NOT NULL,
    email         NVARCHAR(190) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin','cashier')),
    is_active     BIT           NOT NULL DEFAULT 1,
    locale        VARCHAR(5)    NOT NULL DEFAULT 'en' CHECK (locale IN ('en','km')),
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE settings (
    id             INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    store_name     NVARCHAR(150) NOT NULL DEFAULT N'StylePOS',
    address        NVARCHAR(255) NULL,
    phone          NVARCHAR(50)  NULL,
    khr_per_usd    DECIMAL(12,2) NOT NULL DEFAULT 4100,
    receipt_footer NVARCHAR(255) NULL
);

CREATE TABLE categories (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    name       NVARCHAR(100) NOT NULL UNIQUE,
    is_active  BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE products (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id),
    name        NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    brand       NVARCHAR(100) NULL,
    image_path  NVARCHAR(255) NULL,
    is_active   BIT NOT NULL DEFAULT 1,
    created_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_products_category ON products(category_id);

CREATE TABLE variants (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    product_id          INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku                 NVARCHAR(60) NOT NULL UNIQUE,
    barcode             NVARCHAR(60) NULL,
    size                NVARCHAR(20) NOT NULL,
    color               NVARCHAR(40) NOT NULL,
    cost_price          DECIMAL(12,2) NOT NULL DEFAULT 0,
    selling_price       DECIMAL(12,2) NOT NULL,
    stock_quantity      INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    is_active           BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_variant UNIQUE (product_id, size, color)
);
CREATE UNIQUE INDEX UX_variants_barcode ON variants(barcode) WHERE barcode IS NOT NULL;

CREATE TABLE customers (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    name       NVARCHAR(150) NOT NULL,
    phone      NVARCHAR(50)  NULL,
    email      NVARCHAR(190) NULL,
    address    NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE sales (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    receipt_number  NVARCHAR(30) NOT NULL UNIQUE,
    cashier_id      INT NOT NULL REFERENCES users(id),
    customer_id     INT NULL REFERENCES customers(id),
    status          VARCHAR(25) NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('draft','completed','voided','partially_refunded','refunded')),
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'paid',
    currency        CHAR(3)     NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','KHR')),
    exchange_rate   DECIMAL(12,2) NOT NULL DEFAULT 4100,
    subtotal        DECIMAL(14,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
    notes           NVARCHAR(500) NULL,
    void_reason     NVARCHAR(500) NULL,
    idempotency_key NVARCHAR(60) NULL,
    sold_at         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_sales_sold_at ON sales(sold_at);
CREATE UNIQUE INDEX UX_sales_idem ON sales(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE sale_items (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    sale_id      INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    variant_id   INT NOT NULL REFERENCES variants(id),
    product_name NVARCHAR(200) NOT NULL,
    sku          NVARCHAR(60)  NOT NULL,
    size         NVARCHAR(20)  NOT NULL,
    color        NVARCHAR(40)  NOT NULL,
    quantity     INT NOT NULL CHECK (quantity > 0),
    unit_price   DECIMAL(12,2) NOT NULL,
    line_total   DECIMAL(14,2) NOT NULL
);
CREATE INDEX IX_sale_items_sale ON sale_items(sale_id);

CREATE TABLE payments (
    id       INT IDENTITY(1,1) PRIMARY KEY,
    sale_id  INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    method   VARCHAR(20) NOT NULL CHECK (method IN ('cash','khqr','bank_transfer')),
    currency CHAR(3)     NOT NULL CHECK (currency IN ('USD','KHR')),
    amount   DECIMAL(14,2) NOT NULL,
    status   VARCHAR(20) NOT NULL DEFAULT 'paid',
    paid_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_payments_sale ON payments(sale_id);

CREATE TABLE stock_movements (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    variant_id      INT NOT NULL REFERENCES variants(id),
    user_id         INT NULL REFERENCES users(id),
    sale_id         INT NULL REFERENCES sales(id),
    type            VARCHAR(20) NOT NULL,  -- sale, adjustment, void, initial
    quantity_change INT NOT NULL,
    stock_before    INT NOT NULL,
    stock_after     INT NOT NULL,
    reason          NVARCHAR(255) NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_stock_movements_variant ON stock_movements(variant_id);
GO

INSERT INTO settings (id) VALUES (1);
GO

const pool = require('../db');
const { validateProduct } = require('../utils/validators');

const lockInventoryByOrderEvent = async (req, res) => {
  const client = await pool.connect();

  try {
    const internalSecret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.ORDER_INTERNAL_SECRET || 'order_internal_secret_dev';

    if (!internalSecret || internalSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized internal request',
      });
    }

    const { order_id, items } = req.body || {};
    if (!order_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'order_id and non-empty items are required',
      });
    }

    await client.query('BEGIN');

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Invalid product_id or quantity in items');
      }

      const updated = await client.query(
        `UPDATE products
         SET quantity = quantity - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND quantity >= $1
         RETURNING id, name, quantity`,
        [quantity, productId]
      );

      if (updated.rows.length === 0) {
        throw new Error(`Insufficient stock or product not found: product_id=${productId}`);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Inventory locked successfully',
      data: { order_id, locked_items: items.length },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error locking inventory:', error);
    return res.status(409).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// Get all products with optional filters
const getAllProducts = async (req, res) => {
  try {
    const { category_id, brand_id, search, limit = 20, offset = 0 } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category_id) {
      query += ` AND category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (brand_id) {
      query += ` AND brand_id = $${paramIndex}`;
      params.push(brand_id);
      paramIndex++;
    }

    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid product ID is required'
      });
    }

    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
// Get product by Category
const getProductsByCategory = async (req, res) => {
    try {
    const { category_id } = req.params;
    
    if (!category_id || isNaN(category_id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid category ID is required'
      });
    }

    const result = await pool.query(
      'SELECT * FROM products WHERE category_id = $1',
      [category_id]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get product by Brand
const getProductsByBrand = async (req, res) => {
    try {
    const { brand_id } = req.params;
    
    if (!brand_id || isNaN(brand_id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid brand ID is required'
      });
    }

    const result = await pool.query(
      'SELECT * FROM products WHERE brand_id = $1',
      [brand_id]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
// Create new product
const createProduct = async (req, res) => {
  try {
    const validationResult = validateProduct(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        errors: validationResult.errors
      });
    }

    const {
      name,
      description,
      import_price,
      export_price,
      quantity = 0,
      color,
      category_id,
      brand_id,
      image_url,
      series,
      weight
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products (
        name, description, import_price, export_price, quantity, 
        color, category_id, brand_id, image_url, series, weight
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name,
        description || null,
        import_price,
        export_price,
        quantity,
        color || null,
        category_id || null,
        brand_id || null,
        image_url || null,
        series || null,
        weight || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid product ID is required'
      });
    }

    // Check if product exists
    const checkResult = await pool.query(
      'SELECT id FROM products WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Validate data if provided
    if (Object.keys(req.body).length > 0) {
      const validationResult = validateProduct(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          errors: validationResult.errors
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    const fields = [
      'name', 'description', 'import_price', 'export_price',
      'quantity', 'color', 'category_id', 'brand_id',
      'image_url', 'series', 'weight'
    ];

    fields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        updates.push(`${field} = $${paramIndex}`);
        params.push(req.body[field]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE products 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid product ID is required'
      });
    }

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductsByBrand,
  lockInventoryByOrderEvent,
};

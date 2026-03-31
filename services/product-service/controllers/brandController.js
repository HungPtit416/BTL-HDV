const pool = require('../db');
const { validateBrand } = require('../utils/validators');

// Get all brands
const getAllBrands = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      'SELECT * FROM brands ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get brand by ID
const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid brand ID is required'
      });
    }

    const result = await pool.query(
      'SELECT * FROM brands WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new brand
const createBrand = async (req, res) => {
  try {
    const validationResult = validateBrand(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        errors: validationResult.errors
      });
    }

    const { name, description } = req.body;

    const result = await pool.query(
      `INSERT INTO brands (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description || null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update brand
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid brand ID is required'
      });
    }

    // Check if brand exists
    const checkResult = await pool.query(
      'SELECT id FROM brands WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    // Validate data if provided
    if (Object.keys(req.body).length > 0) {
      const validationResult = validateBrand(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          errors: validationResult.errors
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (req.body.hasOwnProperty('name')) {
      updates.push(`name = $${paramIndex}`);
      params.push(req.body.name);
      paramIndex++;
    }

    if (req.body.hasOwnProperty('description')) {
      updates.push(`description = $${paramIndex}`);
      params.push(req.body.description);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    params.push(id);

    const query = `
      UPDATE brands 
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
    console.error('Error updating brand:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete brand
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Valid brand ID is required'
      });
    }

    const result = await pool.query(
      'DELETE FROM brands WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand
};

// Validators for product service

const validateProduct = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Product name is required');
  }
  if (data.name && data.name.trim().length > 255) {
    errors.push('Product name must not exceed 255 characters');
  }

  if (data.description && data.description.trim().length > 5000) {
    errors.push('Description must not exceed 5000 characters');
  }

  if (!data.import_price || isNaN(data.import_price) || data.import_price < 0) {
    errors.push('Valid import price is required and must be non-negative');
  }

  if (!data.export_price || isNaN(data.export_price) || data.export_price < 0) {
    errors.push('Valid export price is required and must be non-negative');
  }

  if (data.quantity && (isNaN(data.quantity) || data.quantity < 0)) {
    errors.push('Quantity must be non-negative');
  }

  if (data.color && data.color.length > 100) {
    errors.push('Color must not exceed 100 characters');
  }

  if (data.category_id && isNaN(data.category_id)) {
    errors.push('Invalid category ID');
  }

  if (data.brand_id && isNaN(data.brand_id)) {
    errors.push('Invalid brand ID');
  }

  if (data.image_url && data.image_url.length > 255) {
    errors.push('Image URL must not exceed 255 characters');
  }

  if (data.series && data.series.length > 255) {
    errors.push('Series must not exceed 255 characters');
  }

  if (data.weight && data.weight.length > 255) {
    errors.push('Weight must not exceed 255 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateBrand = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Brand name is required');
  }
  if (data.name && data.name.trim().length > 255) {
    errors.push('Brand name must not exceed 255 characters');
  }

  if (data.description && data.description.trim().length > 5000) {
    errors.push('Description must not exceed 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateCategory = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Category name is required');
  }
  if (data.name && data.name.trim().length > 255) {
    errors.push('Category name must not exceed 255 characters');
  }

  if (data.description && data.description.trim().length > 5000) {
    errors.push('Description must not exceed 5000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateProduct,
  validateBrand,
  validateCategory
};

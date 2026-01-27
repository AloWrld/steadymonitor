
export async function loadInventory() {
  try {
    const data = await apiCall(inventoryAPI.getAll);
    // Process and display inventory
    return data;
  } catch (error) {
    console.error('Error loading inventory:', error);
    throw error;
  }
}

export async function loadProductDetails(id) {
  return apiCall(inventoryAPI.getById(id));
}

export async function createProduct(productData) {
  return apiCall(inventoryAPI.create, {
    method: 'POST',
    body: JSON.stringify(productData)
  });
}

export async function updateProduct(id, productData) {
  return apiCall(inventoryAPI.update(id), {
    method: 'PUT',
    body: JSON.stringify(productData)
  });
}

export async function deleteProduct(id) {
  return apiCall(inventoryAPI.delete(id), { method: 'DELETE' });
}

export async function loadLowStock() {
  return apiCall(inventoryAPI.getLowStock);
}

export async function restockProduct(id, restockData) {
  return apiCall(inventoryAPI.restock(id), {
    method: 'POST',
    body: JSON.stringify(restockData)
  });
}

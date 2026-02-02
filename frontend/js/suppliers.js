
export async function loadSuppliers() {
  try {
    const data = await apiCall(supplierAPI.getAll);
    // Process and display suppliers
    return data;
  } catch (error) {
    console.error('Error loading suppliers:', error);
    throw error;
  }
}

export async function loadSupplierDetails(id) {
  return apiCall(supplierAPI.getById(id));
}

export async function createSupplier(supplierData) {
  return apiCall(supplierAPI.inventory.create, {
    method: 'POST',
    body: JSON.stringify(supplierData)
  });
}

export async function updateSupplier(id, supplierData) {
  return apiCall(supplierAPI.supplier.update(id), {
    method: 'PUT',
    body: JSON.stringify(supplierData)
  });
}

export async function loadSupplierTransactions(id) {
  return apiCall(supplierAPI.getTransactions(id));
}

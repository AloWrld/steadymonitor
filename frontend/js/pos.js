
export async function loadDepartmentProducts(department) {
  try {
    const data = await getProducts(department);
    // Process and display products
    return data;
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
}

export async function loadDepartments() {
  return apiCall(posAPI.pos.departments);
}

export async function loadCustomers() {
  return apiCall(customerAPI.getAll);
}

export async function searchLearners(query) {
  return apiCall(`${posAPI.searchLearners}?q=${encodeURIComponent(query)}`);
}

export async function processCheckout(checkoutData) {
  try {
    const result = await checkoutSale(checkoutData);
    
    // Print receipt if successful
    if (result.success && result.sale_id) {
      await printReceipt(result.sale_id);
    }
    
    return result;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}

export async function printReceipt(saleId) {
  return apiCall(printAPI.printReceipt, {
    method: 'POST',
    body: JSON.stringify({ sale_id: saleId })
  });
}

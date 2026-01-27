
export async function generateSalesReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`${reportAPI.getSales}?${query}`);
}

export async function generateInventoryReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`${reportAPI.getInventory}?${query}`);
}

export async function generateCustomerReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiCall(`${reportAPI.getCustomers}?${query}`);
}


export async function loadCustomers() {
  try {
    const data = await apiCall(customerAPI.getAll);
    // Process and display customers
    return data;
  } catch (error) {
    console.error('Error loading customers:', error);
    throw error;
  }
}

export async function loadCustomerDetails(id) {
  return apiCall(customerAPI.getById(id));
}

export async function createCustomer(customerData) {
  return apiCall(customerAPI.create, {
    method: 'POST',
    body: JSON.stringify(customerData)
  });
}

export async function updateCustomer(id, customerData) {
  return apiCall(customerAPI.update(id), {
    method: 'PUT',
    body: JSON.stringify(customerData)
  });
}

export async function loadClassCustomers(className) {
  return apiCall(customerAPI.getByClass(className));
}

export async function loadCustomerTransactions(id) {
  return apiCall(customerAPI.getTransactions(id));
}

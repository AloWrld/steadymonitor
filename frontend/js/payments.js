
export async function loadPayments() {
  try {
    const data = await apiCall(paymentAPI.getAll);
    // Process and display payments
    return data;
  } catch (error) {
    console.error('Error loading payments:', error);
    throw error;
  }
}

export async function createPayment(paymentData) {
  return apiCall(paymentAPI.create, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

export async function loadOutstandingPayments() {
  return apiCall(paymentAPI.getOutstanding);
}

export async function loadLearnerPayments(learnerId) {
  return apiCall(paymentAPI.getByLearner(learnerId));
}

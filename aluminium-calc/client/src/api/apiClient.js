import { API_BASE_URL } from '../config';
const BASE_URL = API_BASE_URL;

async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error);
    throw error;
  }
}

// Customers
export const getCustomers = () => fetchAPI('/customers');
export const getCustomerById = (id) => fetchAPI(`/customers/${id}`);
export const createCustomer = (data) => fetchAPI('/customers', { method: 'POST', body: JSON.stringify(data) });
export const updateCustomer = (id, data) => fetchAPI(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCustomer = (id) => fetchAPI(`/customers/${id}`, { method: 'DELETE' });

// Projects
export const getProjects = () => fetchAPI('/projects');
export const getProjectsByCustomer = (customerId) => fetchAPI(`/projects/customer/${customerId}`);
export const createProject = (data) => fetchAPI('/projects', { method: 'POST', body: JSON.stringify(data) });
export const updateProject = (id, data) => fetchAPI(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProject = (id) => fetchAPI(`/projects/${id}`, { method: 'DELETE' });

// Quotations
export const getQuotations = () => fetchAPI('/quotations');
export const getQuotationsByCustomer = (customerId) => fetchAPI(`/quotations/customer/${customerId}`);
export const createQuotation = (data) => fetchAPI('/quotations', { method: 'POST', body: JSON.stringify(data) });
export const deleteQuotation = (id) => fetchAPI(`/quotations/${id}`, { method: 'DELETE' });

// Settings
export const getSettings = () => fetchAPI('/settings');
export const updateSettings = (data) => fetchAPI('/settings', { method: 'PUT', body: JSON.stringify(data) });

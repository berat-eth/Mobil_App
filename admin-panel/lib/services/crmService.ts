import { api, ApiResponse } from '../api';

// CRM Tip Tanımlamaları
export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  title?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  value?: number;
  notes?: string;
  assignedTo?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: number;
  name: string;
  contactId: number;
  contactName?: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  value: number;
  probability: number;
  expectedCloseDate: string;
  description?: string;
  assignedTo?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  relatedType: 'lead' | 'opportunity' | 'contact' | 'other';
  relatedId?: number;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignedTo?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  contactId?: number;
  leadId?: number;
  opportunityId?: number;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  title: string;
  notes?: string;
  status: 'planned' | 'completed' | 'cancelled';
  activityAt?: string;
  duration?: number;
  createdAt: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  title?: string;
  address?: string;
  city?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CRMStats {
  totalLeads: number;
  totalOpportunities: number;
  totalContacts: number;
  activeTasks: number;
  pipelineValue: number;
  conversionRate: number;
  averageDealSize: number;
}

export const crmService = {
  // === LEADS ===
  getLeads: async (page = 1, limit = 20, status?: string) => {
    const params: Record<string, any> = { page, limit };
    if (status) params.status = status;
    return api.get<ApiResponse<{ leads: Lead[]; total: number }>>('/admin/crm/leads', params);
  },

  getLeadById: async (leadId: number) => {
    return api.get<ApiResponse<Lead>>(`/admin/crm/leads/${leadId}`);
  },

  createLead: async (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    return api.post<ApiResponse<Lead>>('/admin/crm/leads', data);
  },

  updateLead: async (leadId: number, data: Partial<Lead>) => {
    return api.put<ApiResponse<Lead>>(`/admin/crm/leads/${leadId}`, data);
  },

  deleteLead: async (leadId: number) => {
    return api.delete<ApiResponse<void>>(`/admin/crm/leads/${leadId}`);
  },

  convertLead: async (leadId: number, opportunityData?: Partial<Opportunity>) => {
    return api.post<ApiResponse<{ contact: Contact; opportunity?: Opportunity }>>(
      `/admin/crm/leads/${leadId}/convert`,
      opportunityData
    );
  },

  // === OPPORTUNITIES ===
  getOpportunities: async (page = 1, limit = 20, stage?: string) => {
    const params: Record<string, any> = { page, limit };
    if (stage) params.stage = stage;
    return api.get<ApiResponse<{ opportunities: Opportunity[]; total: number }>>(
      '/admin/crm/opportunities',
      params
    );
  },

  getOpportunityById: async (opportunityId: number) => {
    return api.get<ApiResponse<Opportunity>>(`/admin/crm/opportunities/${opportunityId}`);
  },

  createOpportunity: async (data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>) => {
    return api.post<ApiResponse<Opportunity>>('/admin/crm/opportunities', data);
  },

  updateOpportunity: async (opportunityId: number, data: Partial<Opportunity>) => {
    return api.put<ApiResponse<Opportunity>>(`/admin/crm/opportunities/${opportunityId}`, data);
  },

  deleteOpportunity: async (opportunityId: number) => {
    return api.delete<ApiResponse<void>>(`/admin/crm/opportunities/${opportunityId}`);
  },

  // === TASKS ===
  getTasks: async (page = 1, limit = 20, status?: string, relatedType?: string) => {
    const params: Record<string, any> = { page, limit };
    if (status) params.status = status;
    if (relatedType) params.relatedType = relatedType;
    return api.get<ApiResponse<{ tasks: Task[]; total: number }>>('/admin/crm/tasks', params);
  },

  getTaskById: async (taskId: number) => {
    return api.get<ApiResponse<Task>>(`/admin/crm/tasks/${taskId}`);
  },

  createTask: async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    return api.post<ApiResponse<Task>>('/admin/crm/tasks', data);
  },

  updateTask: async (taskId: number, data: Partial<Task>) => {
    return api.put<ApiResponse<Task>>(`/admin/crm/tasks/${taskId}`, data);
  },

  deleteTask: async (taskId: number) => {
    return api.delete<ApiResponse<void>>(`/admin/crm/tasks/${taskId}`);
  },

  // === ACTIVITIES ===
  getActivities: async (contactId?: number, leadId?: number, opportunityId?: number) => {
    const params: Record<string, any> = {};
    if (contactId) params.contactId = contactId;
    if (leadId) params.leadId = leadId;
    if (opportunityId) params.opportunityId = opportunityId;
    return api.get<ApiResponse<Activity[]>>('/admin/activities', params);
  },

  createActivity: async (data: Omit<Activity, 'id' | 'createdAt'>) => {
    return api.post<ApiResponse<Activity>>('/admin/activities', data);
  },

  updateActivity: async (activityId: number, data: Partial<Activity>) => {
    return api.put<ApiResponse<Activity>>(`/admin/activities/${activityId}`, data);
  },

  deleteActivity: async (activityId: number) => {
    return api.delete<ApiResponse<void>>(`/admin/activities/${activityId}`);
  },

  // === CONTACTS ===
  getContacts: async (page = 1, limit = 20) => {
    return api.get<ApiResponse<{ contacts: Contact[]; total: number }>>(
      '/admin/crm/contacts',
      { page, limit }
    );
  },

  getContactById: async (contactId: number) => {
    return api.get<ApiResponse<Contact>>(`/admin/crm/contacts/${contactId}`);
  },

  createContact: async (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    return api.post<ApiResponse<Contact>>('/admin/crm/contacts', data);
  },

  updateContact: async (contactId: number, data: Partial<Contact>) => {
    return api.put<ApiResponse<Contact>>(`/admin/crm/contacts/${contactId}`, data);
  },

  deleteContact: async (contactId: number) => {
    return api.delete<ApiResponse<void>>(`/admin/crm/contacts/${contactId}`);
  },

  // === STATS & ANALYTICS ===
  getCRMStats: async () => {
    return api.get<ApiResponse<CRMStats>>('/admin/crm/stats');
  },

  getPipelineData: async () => {
    return api.get<ApiResponse<{ stage: string; count: number; value: number }[]>>(
      '/admin/crm/pipeline'
    );
  },

  // === SEARCH ===
  searchLeads: async (query: string) => {
    return api.get<ApiResponse<Lead[]>>('/admin/crm/leads/search', { q: query });
  },

  searchOpportunities: async (query: string) => {
    return api.get<ApiResponse<Opportunity[]>>('/admin/crm/opportunities/search', { q: query });
  },

  searchContacts: async (query: string) => {
    return api.get<ApiResponse<Contact[]>>('/admin/crm/contacts/search', { q: query });
  },

  // === SCRAPED BUSINESS DATA ===
  getGoogleMapsScrapedData: async (page = 1, limit = 50, search = '', searchTerm = '') => {
    const params: Record<string, any> = { page, limit };
    if (search) params.search = search;
    if (searchTerm) params.searchTerm = searchTerm;
    return api.get<ApiResponse<{ items: any[]; total: number; page: number; limit: number; totalPages: number }>>(
      '/admin/google-maps/scraped-data',
      params
    );
  },

  convertScrapedDataToLead: async (scrapedDataId: number) => {
    return api.post<ApiResponse<any>>(
      `/admin/google-maps/scraped-data/${scrapedDataId}/convert-to-lead`
    );
  },

  deleteScrapedData: async (scrapedDataId: number) => {
    return api.delete<ApiResponse<void>>(`/admin/google-maps/scraped-data/${scrapedDataId}`);
  },
};


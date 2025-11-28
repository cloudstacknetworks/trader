'use client';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

export const submitBug = async (bugData: {
  title: string;
  description: string;
  priority: string;
  reportedBy: string;
}): Promise<ApiResponse> => {
  try {
    const response = await fetch('/api/bugs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bugData),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
};

export const fetchBugDetails = async (bugId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`/api/bugs/${bugId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
};

export const updateBug = async (bugId: string, updates: Partial<{
  status: string;
  priority: string;
  assignedTo: string;
}>): Promise<ApiResponse> => {
  try {
    const response = await fetch(`/api/bugs/${bugId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
};

export const fetchBugsList = async (params?: {
  status?: string;
  priority?: string;
}): Promise<ApiResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    
    const response = await fetch(`/api/bugs?${queryParams.toString()}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
};

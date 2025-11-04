import { useState, useCallback, useRef } from 'react';
import { useAuth } from "@/contextproviders/AuthContext";
import { toast } from "sonner";

const useApi = () => {
  const { getBearerToken, refreshSession, logout } = useAuth();
  const isExecutingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

const execute = useCallback(async (path, method, data = null, retryCount = 0) => {
  setLoading(true);
  setError(null);
  setData(null);
  
  try {
    const token = await getBearerToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(
      `https://8n2m6cwkz3.execute-api.us-east-1.amazonaws.com/latest${path || ''}`,
      {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(data || {}),
      }
    );

    if (response.status === 401 && retryCount === 0) {
      console.log('Got 401, attempting refresh.');
      const refreshResult = await refreshSession();
      
      if (refreshResult.success) {
        console.log('Refresh successful, retrying with new token');
        const newToken = refreshResult.idToken;
        
        const retryResponse = await fetch(
          `https://8n2m6cwkz3.execute-api.us-east-1.amazonaws.com/latest${path || ''}`,
          {
            method: method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': newToken
            },
            body: JSON.stringify(data || {}),
          }
        );
        
        if (!retryResponse.ok) {
          throw new Error(`API Error: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        
        const result = await retryResponse.json();
        setData(result);
        return result;
      } else {
        console.error('Token refresh failed');
        toast.error('Session expired. Please login again.');
        await logout();
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    setData(result);
    return result;
  } catch (err) {
    const errorMessage = err.message || 'An error occurred';
    if (!errorMessage.includes('Session expired')) {
      toast.error(errorMessage);
    }
    setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
}, [getBearerToken, refreshSession, logout]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
};

export default useApi;
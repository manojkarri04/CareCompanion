// lib/networkUtils.ts

// 1. Resilient API Networking
export const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delayMs = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      throw new Error(`Server responded with status ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Fetch failed after maximum retries.");
};

// 2. Proactive Latency Safeguard
export const checkNetworkSpeed = async (apiUrl: string) => {
  const startTime = Date.now(); 
  try {
    const response = await fetch(`${apiUrl}/api/ping`);
    if (response.ok) return Date.now() - startTime;
    return -1;
  } catch {
    return -1; 
  }
};
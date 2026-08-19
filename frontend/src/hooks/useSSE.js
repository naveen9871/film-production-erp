import { useEffect, useState } from 'react';

const useSSE = (productionId, eventTypes = []) => {
  const [latestEvent, setLatestEvent] = useState(null);

  useEffect(() => {
    if (!productionId) return;

    // Use token from localStorage to authenticate SSE via query string
    const token = localStorage.getItem('token');
    
    // We assume the backend expects the token in the query param for SSE since headers aren't supported
    // Let's use the env var or default URL for API
    const baseUrl = 'http://localhost:8080';
    const source = new EventSource(`${baseUrl}/events/${productionId}?token=${token}`);

    source.onopen = () => {
      console.log(`SSE connected for production ${productionId}`);
    };

    source.onerror = (err) => {
      console.error("SSE connection error", err);
      source.close();
    };

    // Listen to specific events
    eventTypes.forEach(type => {
      source.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data);
          setLatestEvent({ type, data, timestamp: Date.now() });
        } catch (err) {
          console.error("Error parsing SSE event data", err);
        }
      });
    });

    return () => {
      source.close();
    };
  }, [productionId, eventTypes.join(',')]);

  return latestEvent;
};

export default useSSE;

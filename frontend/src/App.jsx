import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE}/health`);
        setHealth(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    checkHealth();
  }, []);

  if (loading) return <div className="card">Checking backend health...</div>;

  return (
    <div className="container">
      <h1>Dues Management System</h1>
      <div className="card">
        <h2>Backend Health Check</h2>
        {error && <p className="error">Error: {error}</p>}
        {health && (
          <pre>{JSON.stringify(health, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

export default App;
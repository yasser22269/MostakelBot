import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InstanceDetails from './pages/InstanceDetails';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router basename="/">

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/instance/:id" 
          element={isAuthenticated ? <InstanceDetails /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

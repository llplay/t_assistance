import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ChangePassword from './components/ChangePassword';
import TextbookCenter from './components/TextbookCenter';
import SchedulePlanner from './components/SchedulePlanner';
import CourseList from './components/CourseList';
import CourseDetail from './components/CourseDetail';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/textbooks" element={<TextbookCenter />} />
          <Route path="/schedule" element={<SchedulePlanner />} />
          <Route path="/courses" element={<CourseList />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

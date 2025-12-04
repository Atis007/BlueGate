import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Students from './admin/Students'
import AddStudent from './admin/AddStudent'
import EditStudent from './admin/EditStudent'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/students" replace />} />
        <Route path="/admin/students" element={<Students />} />
        <Route path="/admin/add-student" element={<AddStudent />} />
        <Route path="/admin/edit-student/:id" element={<EditStudent />} />
      </Routes>
    </Router>
  )
}

export default App

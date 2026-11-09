import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import AddLinkPage from './pages/AddLinkPage'
import EditLinkPage from './pages/EditLinkPage'
import ShareTargetPage from './pages/ShareTargetPage'
import TagsPage from './pages/TagsPage'
import FoldersPage from './pages/FoldersPage'
import CalendarPage from './pages/CalendarPage'
import PlazaPage from './pages/PlazaPage'
import ViewPage from './pages/ViewPage'
import FromPage from './pages/FromPage'

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/share" element={<ShareTargetPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><AddLinkPage /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><EditLinkPage /></ProtectedRoute>} />
          <Route path="/tags" element={<ProtectedRoute><TagsPage /></ProtectedRoute>} />
          <Route path="/folders" element={<ProtectedRoute><FoldersPage /></ProtectedRoute>} />
          <Route path="/from" element={<ProtectedRoute><FromPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/plaza" element={<ProtectedRoute><PlazaPage /></ProtectedRoute>} />
          <Route path="/view" element={<ProtectedRoute><ViewPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

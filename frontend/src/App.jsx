import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Activity, Database, Play, BarChart3, Settings, Folder, Sliders, LogOut, User, Users, Building } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import TestRuns from './pages/TestRuns'
import TestReport from './pages/TestReport'
import { TestBatches, TestBatchDetail } from './pages/TestBatches'
import SystemConfig from './pages/SystemConfig'
import UserManagement from './pages/UserManagement'
import OrganizationManagement from './pages/OrganizationManagement'
import Login from './pages/Login'
import Register from './pages/Register'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)
  const { user, logout, isAdmin, organizations, switchOrganization } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // 如果在登录或注册页面，不显示主布局
  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    )
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSwitchOrganization = async (orgId) => {
    try {
      await switchOrganization(orgId)
      setShowOrgSwitcher(false)
    } catch (err) {
      console.error('切换组织失败:', err)
    }
  }

  const navItems = [
    { path: '/', icon: BarChart3, label: '仪表盘' },
    { path: '/test-batches', icon: Folder, label: '测试批管理' },
    { path: '/datasets', icon: Database, label: '测试集管理' },
    { path: '/test-runs', icon: Play, label: '测试运行' },
    { path: '/config', icon: Sliders, label: '系统配置' },
  ]

  if (isAdmin) {
    navItems.push({ path: '/users', icon: Users, label: '用户管理' })
    navItems.push({ path: '/organizations', icon: Building, label: '组织管理' })
  }

  return (
    <div className="flex h-screen bg-dark-900 text-dark-100">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-dark-800 border-r border-dark-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary-500" />
            {sidebarOpen && <span className="font-bold text-lg">AIOps 评测</span>}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-dark-700 text-dark-300 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-dark-700 space-y-2">
          {sidebarOpen && (
            <div className="px-4 py-3 mb-2 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-dark-400 truncate">{user?.email}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-dark-400" />
                      <span className="text-sm text-dark-200">
                        {(() => {
                          const currentOrg = organizations.find(o => o.id === user?.organization_id);
                          if (currentOrg) return currentOrg.name;
                          if (user?.organization_id === user?.native_organization_id || !user?.organization_id) return '默认组织';
                          return '选择组织';
                        })()}
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-dark-400 transition-transform ${showOrgSwitcher ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showOrgSwitcher && (
                    <>
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                        <button
                          onClick={() => handleSwitchOrganization('reset')}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-dark-700 transition-colors flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          <span>我的组织</span>
                          {!user?.organization_id || user?.organization_id === user?.native_organization_id && (
                            <span className="ml-auto text-xs text-primary-400">当前</span>
                          )}
                        </button>
                        {organizations.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => handleSwitchOrganization(org.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-dark-700 transition-colors flex items-center gap-2"
                          >
                            <Building className="w-4 h-4" />
                            <span>{org.name}</span>
                            {user?.organization_id === org.id && (
                              <span className="ml-auto text-xs text-primary-400">当前</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="fixed inset-0 z-40" onClick={() => setShowOrgSwitcher(false)} />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-dark-300 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>退出登录</span>}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg hover:bg-dark-700 text-dark-300 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
            {sidebarOpen && <span>收起侧边栏</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/test-batches" element={
            <ProtectedRoute>
              <TestBatches />
            </ProtectedRoute>
          } />
          <Route path="/test-batches/:id" element={
            <ProtectedRoute>
              <TestBatchDetail />
            </ProtectedRoute>
          } />
          <Route path="/datasets" element={
            <ProtectedRoute>
              <Datasets />
            </ProtectedRoute>
          } />
          <Route path="/test-runs" element={
            <ProtectedRoute>
              <TestRuns />
            </ProtectedRoute>
          } />
          <Route path="/test-runs/:id" element={
            <ProtectedRoute>
              <TestReport />
            </ProtectedRoute>
          } />
          <Route path="/config" element={
            <ProtectedRoute>
              <SystemConfig />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute requireAdmin={true}>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="/organizations" element={
            <ProtectedRoute requireAdmin={true}>
              <OrganizationManagement />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

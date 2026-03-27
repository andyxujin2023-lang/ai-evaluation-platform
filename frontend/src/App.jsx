import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Activity, Database, Play, BarChart3, Settings, Folder, Sliders } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import TestRuns from './pages/TestRuns'
import TestReport from './pages/TestReport'
import { TestBatches, TestBatchDetail } from './pages/TestBatches'
import SystemConfig from './pages/SystemConfig'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems = [
    { path: '/', icon: BarChart3, label: '仪表盘' },
    { path: '/test-batches', icon: Folder, label: '测试批管理' },
    { path: '/datasets', icon: Database, label: '测试集管理' },
    { path: '/test-runs', icon: Play, label: '测试运行' },
    { path: '/config', icon: Sliders, label: '系统配置' },
  ]

  return (
    <BrowserRouter>
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
          <div className="p-4 border-t border-dark-700">
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/test-batches" element={<TestBatches />} />
            <Route path="/test-batches/:id" element={<TestBatchDetail />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/test-runs" element={<TestRuns />} />
            <Route path="/test-runs/:id" element={<TestReport />} />
            <Route path="/config" element={<SystemConfig />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

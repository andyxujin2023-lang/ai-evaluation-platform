import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Activity, Mail, Lock, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(formData.email, formData.password)
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Login failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-primary-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">AIOps 评测平台</h1>
          <p className="text-dark-400 mt-2">登录您的账户</p>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  placeholder="请输入邮箱"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400">
              还没有账户？{' '}
              <Link
                to="/register"
                className="text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center gap-1 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                创建新账户
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

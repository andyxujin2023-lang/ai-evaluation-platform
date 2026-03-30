import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Mail, Lock, User, Building, ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationSlug: '',
  })
  const [loading, setLoading] = useState(false)
  const [joinExisting, setJoinExisting] = useState(false)
  const { register, error } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const data = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organization_name: joinExisting ? undefined : formData.organizationName,
        organization_slug: joinExisting ? undefined : formData.organizationSlug,
        organization_id: joinExisting ? formData.organizationId : undefined,
      }
      await register(data)
      navigate('/')
    } catch (err) {
      console.error('Registration failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-primary-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">创建账户</h1>
          <p className="text-dark-400 mt-2">加入 AIOps 评测平台</p>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* 个人信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  姓名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                    placeholder="请输入姓名"
                  />
                </div>
              </div>

              <div className="col-span-2">
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
            </div>

            {/* 密码 */}
            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                    placeholder="请再次输入密码"
                  />
                </div>
              </div>
            </div>

            {/* 组织信息 */}
            <div className="pt-4 border-t border-dark-700">
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setJoinExisting(false)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    !joinExisting
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  创建新组织
                </button>
                <button
                  type="button"
                  onClick={() => setJoinExisting(true)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    joinExisting
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  加入现有组织
                </button>
              </div>

              {!joinExisting ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      组织名称
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                      <input
                        type="text"
                        required={!joinExisting}
                        value={formData.organizationName}
                        onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                        placeholder="例如：我的公司"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      组织标识（URL 中使用）
                    </label>
                    <input
                      type="text"
                      required={!joinExisting}
                      value={formData.organizationSlug}
                      onChange={(e) => setFormData({ ...formData, organizationSlug: e.target.value.toLowerCase() })}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 font-mono"
                      placeholder="例如：my-company"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    组织 ID
                  </label>
                  <input
                    type="text"
                    required={joinExisting}
                    value={formData.organizationId || ''}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 font-mono"
                    placeholder="请输入组织 ID（请向管理员索取）"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              {loading ? '注册中...' : '创建账户'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400">
              已有账户？{' '}
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center gap-1 mt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register

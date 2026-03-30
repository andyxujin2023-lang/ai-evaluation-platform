import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi, organizationsApi } from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const loadOrganizations = async () => {
    try {
      const res = await organizationsApi.listOrganizations()
      setOrganizations(res.data)
    } catch (err) {
      console.error('Failed to load organizations:', err)
    }
  }

  const checkAuth = async () => {
    try {
      setLoading(true)
      const res = await authApi.getMe()
      setUser(res.data)
      setError(null)
      // 如果是管理员，加载组织列表
      if (res.data.role === 'admin') {
        // 延迟一点加载，确保用户状态已更新
        setTimeout(() => loadOrganizations(), 100)
      }
    } catch (err) {
      setUser(null)
      setOrganizations([])
      if (err.response?.status !== 401) {
        console.error('Auth check failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const switchOrganization = async (orgId) => {
    try {
      await authApi.switchOrganization(orgId)
      // 重新加载用户信息和页面
      await checkAuth()
    } catch (err) {
      console.error('Failed to switch organization:', err)
      throw err
    }
  }

  const login = async (account, password) => {
    try {
      setError(null)
      const res = await authApi.login({ account, password })
      setUser(res.data.user)
      return res.data
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败')
      throw err
    }
  }

  const register = async (data) => {
    try {
      setError(null)
      const res = await authApi.register(data)
      setUser(res.data.user)
      return res.data
    } catch (err) {
      setError(err.response?.data?.detail || '注册失败')
      throw err
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
    }
  }

  const value = {
    user,
    organizations,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth,
    switchOrganization,
    loadOrganizations,
    isAdmin: user?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

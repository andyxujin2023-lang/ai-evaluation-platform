import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Edit, Trash2, Shield, User, Mail, Building, Save, X } from 'lucide-react'
import { usersApi, organizationsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', organization_id: '' })
  const [editingUser, setEditingUser] = useState(null)
  const { user: currentUser } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [usersRes, orgsRes] = await Promise.all([
        usersApi.listUsers(),
        organizationsApi.listOrganizations()
      ])
      setUsers(usersRes.data)
      setOrganizations(orgsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      const userData = { ...newUser }
      if (!userData.organization_id) {
        delete userData.organization_id
      }
      await usersApi.createUser(userData)
      setShowAddModal(false)
      setNewUser({ name: '', email: '', password: '', organization_id: '' })
      loadData()
    } catch (error) {
      console.error('Failed to create user:', error)
      alert(error.response?.data?.detail || '创建用户失败')
    }
  }

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      organization_id: user.organization_id
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    try {
      const updateData = {
        name: editingUser.name,
        role: editingUser.role,
        is_active: editingUser.is_active,
        organization_id: editingUser.organization_id
      }
      await usersApi.updateUser(editingUser.id, updateData)
      setShowEditModal(false)
      setEditingUser(null)
      loadData()
    } catch (error) {
      console.error('Failed to update user:', error)
      alert(error.response?.data?.detail || '更新用户失败')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？')) return
    try {
      await usersApi.deleteUser(userId)
      loadData()
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert(error.response?.data?.detail || '删除用户失败')
    }
  }

  const handleToggleRole = async (userId, currentRole) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin'
      await usersApi.updateUser(userId, { role: newRole })
      loadData()
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert(error.response?.data?.detail || '更新角色失败')
    }
  }

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await usersApi.updateUser(userId, { is_active: !currentActive })
      loadData()
    } catch (error) {
      console.error('Failed to update user:', error)
      alert(error.response?.data?.detail || '更新用户失败')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-dark-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">用户管理</h1>
          <p className="text-dark-400">管理平台中的所有用户</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          添加用户
        </button>
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">用户</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">组织</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">角色</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">创建时间</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-dark-700/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {user.name}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">当前</span>
                          )}
                        </p>
                        <p className="text-sm text-dark-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.organization ? (
                      <div>
                        <p className="font-medium text-white">{user.organization.name}</p>
                        <p className="text-sm text-dark-400 font-mono">{user.organization.slug}</p>
                      </div>
                    ) : (
                      <span className="text-dark-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => user.id !== currentUser?.id && handleToggleRole(user.id, user.role)}
                      disabled={user.id === currentUser?.id}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-dark-600 text-dark-300'
                      } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      <Shield className="w-3 h-3" />
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => user.id !== currentUser?.id && handleToggleActive(user.id, user.is_active)}
                      disabled={user.id === currentUser?.id}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      {user.is_active ? '活跃' : '已禁用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-dark-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 添加用户模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">添加新用户</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-dark-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">姓名</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">邮箱</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  placeholder="请输入邮箱"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">密码</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  placeholder="请输入密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">组织（可选，不选则默认为当前组织）</label>
                <select
                  value={newUser.organization_id}
                  onChange={(e) => setNewUser({ ...newUser, organization_id: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">当前组织</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">编辑用户</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="p-2 text-dark-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">姓名</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">邮箱</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">组织</label>
                <select
                  value={editingUser.organization_id}
                  onChange={(e) => setEditingUser({ ...editingUser, organization_id: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">角色</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">状态</label>
                <select
                  value={editingUser.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.value === 'active' })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">已禁用</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                  }}
                  className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement

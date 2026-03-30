import React, { useState, useEffect } from 'react'
import { Building, Edit, Trash2, Plus, Save, X } from 'lucide-react'
import { organizationsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

function OrganizationManagement() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', slug: '' })
  const { user } = useAuth()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const res = await organizationsApi.listOrganizations()
      setOrganizations(res.data)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await organizationsApi.updateOrganization(editingId, formData)
      } else {
        await organizationsApi.createOrganization(formData)
      }
      setShowAddModal(false)
      setEditingId(null)
      setFormData({ name: '', slug: '' })
      loadOrganizations()
    } catch (error) {
      console.error('Failed to save organization:', error)
      alert(error.response?.data?.detail || '保存失败')
    }
  }

  const handleEdit = (org) => {
    setEditingId(org.id)
    setFormData({ name: org.name, slug: org.slug })
    setShowAddModal(true)
  }

  const handleDelete = async (orgId) => {
    if (orgId === user?.organization_id) {
      alert('不能删除自己所属的组织')
      return
    }
    if (!window.confirm('确定要删除这个组织吗？这将同时删除该组织的所有数据！')) return
    try {
      await organizationsApi.deleteOrganization(orgId)
      loadOrganizations()
    } catch (error) {
      console.error('Failed to delete organization:', error)
      alert(error.response?.data?.detail || '删除失败')
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
          <h1 className="text-3xl font-bold text-white mb-2">组织管理</h1>
          <p className="text-dark-400">管理平台中的所有组织</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setFormData({ name: '', slug: '' })
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加组织
        </button>
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">组织名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">组织标识</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">创建时间</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-dark-700/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {org.name}
                          {org.id === user?.organization_id && (
                            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">当前</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-dark-300">{org.slug}</span>
                  </td>
                  <td className="px-6 py-4 text-dark-400 text-sm">
                    {new Date(org.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(org)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingId ? '编辑组织' : '添加组织'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingId(null)
                  setFormData({ name: '', slug: '' })
                }}
                className="p-2 text-dark-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">组织名称</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  placeholder="例如：我的公司"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">组织标识（URL中使用）</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 font-mono"
                  placeholder="例如：my-company"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingId(null)
                    setFormData({ name: '', slug: '' })
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
                  {editingId ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrganizationManagement

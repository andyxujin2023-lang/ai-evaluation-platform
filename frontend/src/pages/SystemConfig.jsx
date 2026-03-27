import React, { useState, useEffect } from 'react'
import { Save, Key, Link, Settings } from 'lucide-react'
import { configApi } from '../api'

function SystemConfig() {
  const [configs, setConfigs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingConfigs, setEditingConfigs] = useState({})

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const res = await configApi.getConfigs()
      setConfigs(res.data)
      const initialEditing = {}
      Object.keys(res.data).forEach(key => {
        initialEditing[key] = res.data[key].value
      })
      setEditingConfigs(initialEditing)
    } catch (error) {
      console.error('Failed to load configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await configApi.updateConfigsBatch(editingConfigs)
      await loadConfigs()
      alert('配置保存成功！')
    } catch (error) {
      console.error('Failed to save configs:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const isSecretKey = (key) => {
    return key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')
  }

  const getConfigIcon = (key) => {
    if (key.includes('DIFY')) return <Link className="w-5 h-5" />
    if (key.includes('TONGYI')) return <Key className="w-5 h-5" />
    return <Settings className="w-5 h-5" />
  }

  const getConfigGroup = (key) => {
    if (key.startsWith('DIFY_')) return 'Dify 配置'
    if (key.startsWith('TONGYI_')) return '通义千问配置'
    return '其他配置'
  }

  const groupedConfigs = Object.keys(configs).reduce((acc, key) => {
    const group = getConfigGroup(key)
    if (!acc[group]) acc[group] = []
    acc[group].push(key)
    return acc
  }, {})

  const handleInputChange = (key, value) => {
    // 如果是密钥且输入的是星号，不允许
    if (isSecretKey(key) && value === '********') {
      return
    }
    setEditingConfigs({
      ...editingConfigs,
      [key]: value
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-dark-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">系统配置</h1>
          <p className="text-dark-400">配置 API 密钥和系统参数</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedConfigs).map(([group, keys]) => (
          <div key={group} className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            <div className="px-6 py-4 bg-dark-700/50 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-white">{group}</h3>
            </div>
            <div className="divide-y divide-dark-700">
              {keys.map((key) => (
                <div key={key} className="px-6 py-4">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-primary-400">
                        {getConfigIcon(key)}
                      </div>
                      <label className="block text-sm font-medium text-white">
                        {configs[key]?.description || key}
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={editingConfigs[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white font-mono focus:outline-none focus:border-primary-500"
                        placeholder={isSecretKey(key) ? '如需修改请输入新密钥' : `请输入 ${configs[key]?.description || key}`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-dark-500">
                      配置键：{key}
                      {isSecretKey(key) && ' · 密钥保存后不可查看'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-300 text-sm">
          <strong>提示：</strong>API 密钥保存后将显示为星号，如需修改请直接输入新密钥后保存。
        </p>
      </div>
    </div>
  )
}

export default SystemConfig

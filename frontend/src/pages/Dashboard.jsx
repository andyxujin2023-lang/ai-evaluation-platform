import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Clock, Database, Play, AlertCircle, CheckCircle } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { testRunsApi, datasetsApi } from '../api'

function Dashboard() {
  const [testRuns, setTestRuns] = useState([])
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [runsRes, datasetsRes] = await Promise.all([
        testRunsApi.listTestRuns(),
        datasetsApi.listQuestions()
      ])
      setTestRuns(runsRes.data)
      setDatasets(datasetsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreChartOption = () => {
    const completedRuns = testRuns.filter(r => r.status === 'completed').slice(-10)
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: completedRuns.map(r => r.name),
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155' } }
      },
      series: [{
        name: '平均分',
        type: 'line',
        smooth: true,
        data: completedRuns.map(r => r.average_score),
        lineStyle: { color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' }
            ]
          }
        }
      }]
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'running': return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'running': return '运行中'
      case 'failed': return '失败'
      default: return '等待中'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-dark-400">加载中...</div>
      </div>
    )
  }

  const latestRun = testRuns.find(r => r.status === 'completed')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">仪表盘</h1>
        <p className="text-dark-400">AI运维评测平台概览</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{datasets.length}</div>
          <div className="text-dark-400">测试问题数量</div>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{testRuns.length}</div>
          <div className="text-dark-400">测试运行次数</div>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {latestRun ? `${latestRun.average_score?.toFixed(1)}` : '-'}
          </div>
          <div className="text-dark-400">最新平均分</div>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {new Set(datasets.map(d => d.category)).size}
          </div>
          <div className="text-dark-400">测试分类数</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-dark-800 rounded-xl p-6 border border-dark-700">
          <h3 className="text-lg font-semibold text-white mb-4">分数趋势</h3>
          <div className="h-80">
            <ReactECharts option={getScoreChartOption()} style={{ height: '100%' }} />
          </div>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">最近测试</h3>
            <Link to="/test-runs" className="text-primary-500 hover:text-primary-400 text-sm">查看全部</Link>
          </div>
          <div className="space-y-4">
            {testRuns.slice(0, 5).map((run) => (
              <Link key={run.id} to={`/test-runs/${run.id}`} className="block">
                <div className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="text-white font-medium">{run.name}</div>
                      <div className="text-dark-400 text-sm">{new Date(run.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {run.average_score && (
                      <div className={`font-bold ${run.average_score >= 80 ? 'text-green-500' : run.average_score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {run.average_score.toFixed(1)}
                      </div>
                    )}
                    <div className="text-dark-400 text-sm">{getStatusText(run.status)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          to="/datasets"
          className="px-6 py-3 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors"
        >
          管理测试集
        </Link>
        <Link
          to="/test-runs"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          开始新测试
        </Link>
      </div>
    </div>
  )
}

export default Dashboard

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, AlertCircle, CheckCircle, XCircle, FileText, Eye, EyeOff, Terminal, Download, FileSpreadsheet, FileSpreadsheet as FileCsv } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { testRunsApi } from '../api'

function TestReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [progress, setProgress] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const [logFilterType, setLogFilterType] = useState('')
  const [expandedQuestionId, setExpandedQuestionId] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [reportRes, progressRes, logsRes] = await Promise.all([
        testRunsApi.getTestReport(id),
        testRunsApi.getTestProgress(id),
        testRunsApi.getTestLogs(id)
      ])
      setReport(reportRes.data)
      setProgress(progressRes.data)
      setLogs(logsRes.data)
    } catch (error) {
      console.error('Failed to load report:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
    if (report?.overview?.test_run?.status !== 'completed') {
      const interval = setInterval(loadData, 2000)
      return () => clearInterval(interval)
    }
  }, [loadData, report?.overview?.test_run?.status])

  const getRadarOption = () => {
    if (!report) return {}
    const { dimension_scores } = report.overview
    return {
      tooltip: {},
      radar: {
        indicator: [
          { name: '准确性', max: 100 },
          { name: '完整性', max: 100 },
          { name: '可操作性', max: 100 },
          { name: '一致性', max: 100 }
        ],
        axisName: {
          color: '#94a3b8'
        },
        splitArea: {
          areaStyle: { color: ['#334155', '#1e293b'] }
        },
        splitLine: { lineStyle: { color: '#475569' } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            dimension_scores.accuracy,
            dimension_scores.completeness,
            dimension_scores.actionability,
            dimension_scores.consistency
          ],
          areaStyle: { color: 'rgba(59, 130, 246, 0.3)' },
          lineStyle: { color: '#3b82f6' },
          itemStyle: { color: '#3b82f6' }
        }]
      }]
    }
  }

  const getCategoryOption = () => {
    if (!report) return {}
    const categories = Object.entries(report.overview.category_stats)
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories.map(c => c[0]),
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
        type: 'bar',
        data: categories.map(c => c[1]),
        itemStyle: {
          color: (params) => {
            const score = params.value
            return score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'
          }
        },
        barWidth: '60%'
      }]
    }
  }

  const getDistributionOption = () => {
    if (!report) return {}
    const scores = report.results.map(r => r.total_score || 0)
    const bins = [0, 20, 40, 60, 80, 100]
    const distribution = Array(5).fill(0)
    scores.forEach(score => {
      for (let i = 0; i < bins.length - 1; i++) {
        if (score >= bins[i] && score < bins[i + 1]) {
          distribution[i]++
          break
        }
      }
      if (score === 100) distribution[4]++
    })
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['0-20', '20-40', '40-60', '60-80', '80-100'],
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155' } }
      },
      series: [{
        type: 'bar',
        data: distribution,
        itemStyle: { color: '#3b82f6' },
        barWidth: '60%'
      }]
    }
  }

  const filteredResults = report?.results.filter(r => {
    const matchesSearch = !searchTerm ||
      r.question.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || r.category === filterCategory
    const matchesScore = !filterScore ||
      (filterScore === 'low' && (r.total_score || 0) < 60) ||
      (filterScore === 'medium' && (r.total_score || 0) >= 60 && (r.total_score || 0) < 80) ||
      (filterScore === 'high' && (r.total_score || 0) >= 80)
    return matchesSearch && matchesCategory && matchesScore
  }) || []

  const filteredLogs = logs.filter(log => {
    return !logFilterType || log.log_type === logFilterType
  })

  const getQuestionLogs = (questionId) => {
    return logs.filter(log => log.question_id === questionId)
  }

  const getLogTypeIcon = (logType) => {
    switch (logType) {
      case 'info': return <Terminal className="w-4 h-4 text-blue-400" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'dify_request':
      case 'dify_response': return <Terminal className="w-4 h-4 text-purple-400" />
      case 'scoring_request':
      case 'scoring_response': return <Terminal className="w-4 h-4 text-green-400" />
      default: return <Terminal className="w-4 h-4 text-gray-400" />
    }
  }

  const getLogTypeLabel = (logType) => {
    switch (logType) {
      case 'info': return '信息'
      case 'error': return '错误'
      case 'dify_request': return 'Dify请求'
      case 'dify_response': return 'Dify响应'
      case 'scoring_request': return '评分请求'
      case 'scoring_response': return '评分响应'
      default: return logType
    }
  }

  const getScoreIcon = (score) => {
    if (score == null) return <AlertCircle className="w-5 h-5 text-yellow-500" />
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (score >= 60) return <AlertCircle className="w-5 h-5 text-yellow-500" />
    return <XCircle className="w-5 h-5 text-red-500" />
  }

  const categories = report ? [...new Set(report.results.map(r => r.category))] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-dark-400">加载中...</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-dark-400">报告不存在</div>
      </div>
    )
  }

  const { overview } = report

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/test-runs')}
          className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-dark-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">{overview.test_run.name}</h1>
          <p className="text-dark-400">
            {overview.test_run.description || '测试报告'}
          </p>
        </div>
        {overview.test_run.status === 'completed' && (
          <div className="flex gap-2">
            <button
              onClick={() => testRunsApi.exportExcel(id)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              导出 Excel
            </button>
            <button
              onClick={() => testRunsApi.exportCsv(id)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              导出 CSV
            </button>
          </div>
        )}
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-700 hover:bg-dark-700 transition-colors"
        >
          {showLogs ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          {showLogs ? '隐藏日志' : '显示日志'}
        </button>
      </div>

      {overview.test_run.status === 'running' && progress && (
        <div className="mb-8 bg-dark-800 rounded-xl p-6 border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-medium">测试进行中</span>
            <span className="text-primary-400">{progress.percentage.toFixed(0)}%</span>
          </div>
          <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="mt-2 text-dark-400 text-sm">
            已完成 {progress.completed}/{progress.total} 题
          </div>
        </div>
      )}

      {showLogs && (
        <div className="mb-8 bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              执行日志
            </h3>
            <select
              value={logFilterType}
              onChange={(e) => setLogFilterType(e.target.value)}
              className="px-3 py-1 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">全部类型</option>
              <option value="info">信息</option>
              <option value="error">错误</option>
              <option value="dify_request">Dify请求</option>
              <option value="dify_response">Dify响应</option>
              <option value="scoring_request">评分请求</option>
              <option value="scoring_response">评分响应</option>
            </select>
          </div>
          <div className="max-h-96 overflow-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 border-b border-dark-700 hover:bg-dark-700/30">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getLogTypeIcon(log.log_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-dark-700 rounded text-dark-300">
                        {getLogTypeLabel(log.log_type)}
                      </span>
                      <span className="text-dark-400 text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-white mb-2">{log.message}</div>
                    {log.details && (
                      <details className="mt-2">
                        <summary className="text-primary-400 text-sm cursor-pointer">查看详情</summary>
                        <pre className="mt-2 p-3 bg-dark-900 rounded text-dark-300 text-xs overflow-auto max-h-48">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-dark-400">
                没有日志记录
              </div>
            )}
          </div>
        </div>
      )}

      {overview.test_run.status === 'completed' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="text-dark-400 text-sm mb-2">平均分</div>
              <div className={`text-3xl font-bold ${
                overview.average_score >= 80 ? 'text-green-500' :
                overview.average_score >= 60 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {overview.average_score.toFixed(1)}
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="text-dark-400 text-sm mb-2">准确性</div>
              <div className="text-3xl font-bold text-white">{overview.dimension_scores.accuracy.toFixed(1)}</div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="text-dark-400 text-sm mb-2">完整性</div>
              <div className="text-3xl font-bold text-white">{overview.dimension_scores.completeness.toFixed(1)}</div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="text-dark-400 text-sm mb-2">可操作性</div>
              <div className="text-3xl font-bold text-white">{overview.dimension_scores.actionability.toFixed(1)}</div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="text-dark-400 text-sm mb-2">幻觉率</div>
              <div className={`text-3xl font-bold ${overview.hallucination_rate > 20 ? 'text-red-500' : 'text-white'}`}>
                {overview.hallucination_rate.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-4">评分维度</h3>
              <div className="h-72">
                <ReactECharts option={getRadarOption()} style={{ height: '100%' }} />
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-4">分类统计</h3>
              <div className="h-72">
                <ReactECharts option={getCategoryOption()} style={{ height: '100%' }} />
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-4">分数分布</h3>
              <div className="h-72">
                <ReactECharts option={getDistributionOption()} style={{ height: '100%' }} />
              </div>
            </div>
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700">
            <div className="p-6 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-4">问题明细</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      placeholder="搜索问题..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">全部分类</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={filterScore}
                  onChange={(e) => setFilterScore(e.target.value)}
                  className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">全部分数</option>
                  <option value="high">高分 (≥80)</option>
                  <option value="medium">中等 (60-80)</option>
                  <option value="low">低分 (&lt;60)</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-dark-700">
              {filteredResults.map((result, index) => {
                const questionLogs = getQuestionLogs(result.question_id)
                const isExpanded = expandedQuestionId === result.id
                return (
                  <div key={result.id} className="divide-y divide-dark-700">
                    <details className="group" open={isExpanded}>
                      <summary
                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-dark-700/30 list-none"
                        onClick={(e) => {
                          e.preventDefault()
                          setExpandedQuestionId(isExpanded ? null : result.id)
                        }}
                      >
                        <div className="flex items-center gap-4">
                          {getScoreIcon(result.total_score)}
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">
                              {index + 1}. {result.question}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded text-xs">
                                {result.category}
                              </span>
                              {result.total_score != null && (
                                <span className={`text-sm font-medium ${
                                  result.total_score >= 80 ? 'text-green-500' :
                                  result.total_score >= 60 ? 'text-yellow-500' : 'text-red-500'
                                }`}>
                                  {result.total_score.toFixed(1)} 分
                                </span>
                              )}
                              {questionLogs.length > 0 && (
                                <span className="text-primary-400 text-sm flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {questionLogs.length} 条日志
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-dark-400 group-open:rotate-180 transition-transform">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </summary>
                      <div className="px-6 pb-6 pt-2 bg-dark-700/20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          <div>
                            <h4 className="text-sm font-semibold text-dark-400 mb-2">标准答案</h4>
                            <p className="text-dark-200 whitespace-pre-wrap">{result.standard_answer}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-dark-400 mb-2">AI 回答</h4>
                            <p className="text-white whitespace-pre-wrap">{result.ai_answer || '无回答'}</p>
                          </div>
                        </div>
                        {result.issues && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-dark-400 mb-2">问题分析</h4>
                            <p className="text-yellow-300">{result.issues}</p>
                          </div>
                        )}
                        {result.accuracy != null && (
                          <div className="mb-6 flex flex-wrap gap-6">
                            <div className="text-sm">
                              <span className="text-dark-400">准确性：</span>
                              <span className="text-white">{result.accuracy.toFixed(1)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-dark-400">完整性：</span>
                              <span className="text-white">{result.completeness.toFixed(1)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-dark-400">可操作性：</span>
                              <span className="text-white">{result.actionability.toFixed(1)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-dark-400">一致性：</span>
                              <span className="text-white">{result.consistency.toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                        {questionLogs.length > 0 && (
                          <div className="border-t border-dark-700 pt-4">
                            <h4 className="text-sm font-semibold text-dark-400 mb-3">执行日志</h4>
                            <div className="space-y-3">
                              {questionLogs.map((log) => (
                                <div key={log.id} className="p-3 bg-dark-800 rounded-lg border border-dark-700">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{getLogTypeIcon(log.log_type)}</div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs px-2 py-0.5 bg-dark-700 rounded text-dark-300">
                                          {getLogTypeLabel(log.log_type)}
                                        </span>
                                        <span className="text-dark-400 text-xs">
                                          {new Date(log.created_at).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="text-white text-sm mb-2">{log.message}</div>
                                      {log.details && (
                                        <details className="mt-2">
                                          <summary className="text-primary-400 text-xs cursor-pointer">查看详情</summary>
                                          <pre className="mt-2 p-3 bg-dark-900 rounded text-dark-300 text-xs overflow-auto max-h-40">
                                            {JSON.stringify(log.details, null, 2)}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
            {filteredResults.length === 0 && (
              <div className="px-6 py-12 text-center text-dark-400">
                没有找到匹配的问题
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default TestReport

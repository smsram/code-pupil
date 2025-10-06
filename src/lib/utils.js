export const formatCode = (code) => {
  if (!code) return ''
  
  return code
    .replace(/def /g, '<span style="color: #8b5cf6;">def</span> ')
    .replace(/class /g, '<span style="color: #8b5cf6;">class</span> ')
    .replace(/if /g, '<span style="color: #f59e0b;">if</span> ')
    .replace(/else/g, '<span style="color: #f59e0b;">else</span>')
    .replace(/for /g, '<span style="color: #f59e0b;">for</span> ')
    .replace(/while /g, '<span style="color: #f59e0b;">while</span> ')
    .replace(/return /g, '<span style="color: #22c55e;">return</span> ')
    .replace(/import /g, '<span style="color: #06b6d4;">import</span> ')
    .replace(/from /g, '<span style="color: #06b6d4;">from</span> ')
    .replace(/#.*$/gm, '<span style="color: #6b7280;">$&</span>')
    .replace(/(".*?")/g, '<span style="color: #10b981;">$1</span>')
    .replace(/('.*?')/g, '<span style="color: #10b981;">$1</span>')
}

export const getElapsedTime = (startTime) => {
  const now = new Date()
  const [hours, minutes] = startTime.split(':').map(Number)
  const start = new Date()
  start.setHours(hours, minutes, 0, 0)
  
  const diffMs = now - start
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  return Math.max(diffMins, 0)
}

export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export const getSimilarityClass = (similarity) => {
  if (similarity > 80) return 'high'
  if (similarity > 40) return 'medium'
  return 'low'
}

export const getProgressClass = (progress) => {
  if (progress > 75) return 'high'
  if (progress > 50) return 'medium'
  return 'low'
}

export const exportToCsv = (data, filename) => {
  const csvContent = data.map(row => 
    Object.values(row).map(val => 
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(',')
  ).join('\n')
  
  const header = Object.keys(data[0]).join(',')
  const fullContent = header + '\n' + csvContent
  
  const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

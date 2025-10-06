'use client'

import { useState, useEffect, useRef } from 'react'

export default function TestTimer({ endTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [status, setStatus] = useState('normal')
  const hasExpiredRef = useRef(false)
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const end = new Date(endTime)
      const diff = end - now
      
      if (diff <= 0) {
        setTimeLeft('00:00')
        setStatus('expired')
        
        // Only call onExpire ONCE
        if (!hasExpiredRef.current && onExpire) {
          hasExpiredRef.current = true
          onExpire()
        }
        return
      }
      
      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      
      if (minutes < 5) {
        setStatus('danger')
      } else if (minutes < 10) {
        setStatus('warning')
      } else {
        setStatus('normal')
      }
    }
    
    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    
    return () => clearInterval(timer)
  }, [endTime, onExpire])
  
  return (
    <div>
      <div className={`student-timer-display ${status}`}>
        {timeLeft}
      </div>
      <div className="student-timer-label">Time Remaining</div>
    </div>
  )
}

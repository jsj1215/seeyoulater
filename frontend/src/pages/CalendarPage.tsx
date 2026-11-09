import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBookmarkDates, getBookmarksByDate } from '../api/calendar'
import type { Bookmark } from '../api/bookmarks'
import LinkCard from '../components/LinkCard'
import { t } from '../styles/theme'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TrafficLights = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {['#ff6b5b','#ffd055','#4dbb5f'].map((c, i) => (
      <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: `1px solid ${i===0?'#d94f42':i===1?'#d4a800':'#3a9a4a'}` }} />
    ))}
  </div>
)

export default function CalendarPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  // 마지막으로 응답을 받은 날짜. 선택한 날짜와 다르면 로딩 중으로 표시
  const [loadedDate, setLoadedDate] = useState<string | null>(null)
  const loading = selectedDate !== null && selectedDate !== loadedDate

  // 월 변경 시 marked dates fetch (초기 마운트 포함)
  useEffect(() => {
    getBookmarkDates(year, month).then(dates => setMarkedDates(new Set(dates))).catch(() => {})
  }, [year, month])

  // 날짜 선택 시 북마크 fetch
  useEffect(() => {
    // 선택 해제 시 목록은 렌더링 단계에서 selectedDate로 가려짐
    if (!selectedDate) return
    getBookmarksByDate(selectedDate)
      .then(data => setBookmarks(data.content))
      .catch(() => setBookmarks([]))
      .finally(() => setLoadedDate(selectedDate))
  }, [selectedDate])

  // 월 변경 시 날짜 선택 초기화 (마운트 제외)
  const prevYearMonth = useRef<string | null>(null)
  useEffect(() => {
    const key = `${year}-${month}`
    if (prevYearMonth.current !== null && prevYearMonth.current !== key) {
      setSelectedDate(null)
    }
    prevYearMonth.current = key
  }, [year, month])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const dateStr = (day: number) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div style={{ background: t.bg, minHeight: '100vh' }}>
      {/* Title Bar */}
      <div style={{ background: t.titleBar, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 32, zIndex: 20 }}>
        <TrafficLights />
        <button onClick={() => navigate('/')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: "'Courier New', Monaco, monospace", cursor: 'pointer', marginLeft: 8 }}>
          &lt; Back
        </button>
        <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontFamily: "'Courier New', Monaco, monospace", fontWeight: 'bold', marginRight: 60 }}>
          Calendar
        </span>
      </div>

      {/* Status */}
      <div style={{ background: t.surface2, borderBottom: `2px solid ${t.border}`, padding: '3px 16px', fontSize: 11, fontFamily: "'Courier New', Monaco, monospace", color: t.textMuted }}>
        ● {markedDates.size} day(s) with bookmarks
      </div>

      <div style={{ padding: 12 }}>
        {/* Calendar widget */}
        <div style={{ background: t.surface, border: `2px solid ${t.border}`, boxShadow: t.bevelOut, borderRadius: t.radius, overflow: 'hidden', marginBottom: 16 }}>
          {/* Month header */}
          <div style={{ background: t.titleBar, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={prevMonth} style={{ color: '#fff', fontFamily: "'Courier New', Monaco, monospace", fontSize: 16, cursor: 'pointer', padding: '0 8px' }}>◀</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#fff', fontFamily: "'Courier New', Monaco, monospace", fontSize: 14, fontWeight: 'bold' }}>
                {MONTHS[month - 1]} {year}
              </span>
              <button
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1) }}
                style={{ color: '#fff', fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, cursor: 'pointer', padding: '2px 8px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: t.radiusSm }}
              >
                Today
              </button>
            </div>
            <button onClick={nextMonth} style={{ color: '#fff', fontFamily: "'Courier New', Monaco, monospace", fontSize: 16, cursor: 'pointer', padding: '0 8px' }}>▶</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: t.surface2, borderBottom: `1px solid ${t.border}` }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '6px 0', textAlign: 'center', fontFamily: "'Courier New', Monaco, monospace", fontSize: 10, color: t.textMuted, letterSpacing: '0.05em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ padding: '6px 0', borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, minHeight: 32 }} />
              const ds = dateStr(day)
              const hasBookmarks = markedDates.has(ds)
              const isToday = ds === todayStr
              const isSelected = ds === selectedDate
              return (
                <div key={i} onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                  style={{
                    padding: '4px 2px', textAlign: 'center',
                    borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
                    background: isSelected ? t.primary : isToday ? `${t.primary}22` : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    minHeight: 32,
                    overflow: 'hidden',
                  }}>
                  <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 11, fontWeight: isToday ? 'bold' : 'normal', color: isSelected ? t.textOnDark : isToday ? t.primary : t.text, lineHeight: 1.2 }}>
                    {day}
                  </div>
                  {hasBookmarks && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? t.textOnDark : t.primary, margin: '2px auto 0' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected date bookmarks */}
        {selectedDate && (
          <div>
            <div style={{ fontFamily: "'Courier New', Monaco, monospace", fontSize: 12, color: t.textMuted, marginBottom: 8, padding: '0 4px' }}>
              ● {selectedDate} — {bookmarks.length} bookmark(s)
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20, fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>Loading...</div>
            ) : bookmarks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, fontFamily: "'Courier New', Monaco, monospace", fontSize: 13, color: t.textMuted }}>[ No bookmarks ]</div>
            ) : (
              bookmarks.map(b => <LinkCard key={b.id} bookmark={b} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}

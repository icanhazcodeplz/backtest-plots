import { useState, useEffect } from 'react'
import './App.css'
import Chart from './components/Chart'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (window.__BACKTEST_DATA__) {
      setData(window.__BACKTEST_DATA__)
      setLoading(false)
      return
    }
    fetch('http://127.0.0.1:5001/api/data')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.json()
      })
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(error => {
        setError(error.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="App">
      {loading && <p>Loading data...</p>}
      {error && <p>Error: {error}</p>}
      {data && <Chart data={data} />}
    </div>
  )
}

export default App

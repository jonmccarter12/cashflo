import dynamic from 'next/dynamic'

const Dashboard = dynamic(() => import('../components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)'
    }}>
      <p>Loading Dashboard...</p>
    </div>
  )
})

export default function Home() {
  return <Dashboard />
}

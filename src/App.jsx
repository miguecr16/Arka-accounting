import NewExpenseForm from './components/NewExpenseForm.jsx'

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '1px' }}>
      <header style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <h1 style={{ margin: 0, color: '#1f2937' }}>Arka Design OS</h1>
      </header>
      <main>
        <NewExpenseForm />
      </main>
    </div>
  )
}

export default App

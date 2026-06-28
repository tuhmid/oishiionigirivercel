'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '10px 24px',
        background: '#000',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        letterSpacing: '0.1em',
        fontFamily: 'monospace',
      }}
    >
      PRINT RECEIPT
    </button>
  )
}

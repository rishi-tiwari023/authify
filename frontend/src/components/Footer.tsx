function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      padding: '0.25rem 0',
      textAlign: 'center',
      borderTop: '1px solid rgba(148, 163, 184, 0.1)',
      color: '#94a3b8',
      fontSize: '1rem',
      background: 'rgba(2, 6, 23, 0.4)',
      backdropFilter: 'blur(8px)'
    }}>
      <p style={{ margin: 0 }}>© {year} Authify. All rights reserved.</p>
    </footer>
  )
}

export default Footer


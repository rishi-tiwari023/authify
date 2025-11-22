const linkGroups = [
  {
    title: 'Resources',
    links: [
      { label: 'Docs', href: '#' },
      { label: 'Status', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
]

function Footer() {
  const year = new Date().getFullYear()

  return (
    <section className="panel site-footer">
      <div className="footer-content">
        <div>
          <p className="footer-brand">Authify</p>
          <p className="footer-copy">
            Modern authentication rails for every product team.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          {linkGroups.map((group) => (
            <div key={group.title} className="footer-link-group">
              <p className="eyebrow">{group.title}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <p className="footer-meta">© {year} Authify. Built with care in React + Vite.</p>
    </section>
  )
}

export default Footer


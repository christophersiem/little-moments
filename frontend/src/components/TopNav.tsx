interface TopNavProps {
  pathname: string
  navigate: (nextPath: string) => void
}

export function TopNav({ pathname, navigate }: TopNavProps) {
  return (
    <div className="topbar-nav">
      <button
        className={`button button-nav ${pathname.startsWith('/record') ? 'button-nav-active' : ''}`}
        onClick={() => navigate('/record')}
      >
        Record
      </button>
      <button
        className={`button button-nav ${pathname.startsWith('/memories') ? 'button-nav-active' : ''}`}
        onClick={() => navigate('/memories')}
      >
        Memories
      </button>
    </div>
  )
}

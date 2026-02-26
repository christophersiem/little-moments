interface RouteNotFoundProps {
  navigate: (nextPath: string) => void
}

export function RouteNotFound({ navigate }: RouteNotFoundProps) {
  return (
    <section className="panel">
      <h2>Route not found</h2>
      <p>The path does not match the reduced MVP routes.</p>
      <button className="button button-primary" onClick={() => navigate('/record')}>
        Back to Record
      </button>
    </section>
  )
}

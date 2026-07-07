// Placeholder for Angular routes not yet ported to React. Lets the router and
// navigation work end-to-end while pages are filled in one at a time.
type PropType = {
  name: string
}

export function Stub({ name }: PropType) {
  return (
    <div>
      <h1>{name}</h1>
      <p style={{ color: '#888' }}>Not ported to React yet.</p>
    </div>
  )
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <style>{`
        body { background: #f9fafb !important; margin: 0; padding: 0; }
      `}</style>
      {children}
    </>
  )
}
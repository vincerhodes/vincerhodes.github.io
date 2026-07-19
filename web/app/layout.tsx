// Root layout: html/body only. Site chrome lives in the route-group layouts —
// app/(main)/layout.tsx mounts SiteHeader/SiteFooter + the main-site design system,
// app/turnerandrhodes/layout.tsx mounts the T&R chrome + its own scoped CSS. Keeping a
// single top-level root layout avoids the full-page-reload behaviour of multiple root
// layouts (see next/dist/docs route-groups.md).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning: the T&R theme boot script sets class/data-theme on <html>
  // before hydration (standard theme-script pattern).
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

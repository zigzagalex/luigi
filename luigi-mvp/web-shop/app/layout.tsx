export const metadata = {
  title: "Luigi Web-Shop",
  description: "Bike rentals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

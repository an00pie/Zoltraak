import "./globals.css";

export const metadata = {
  title: "Zoltraak — EV Charging Route Planner & H3 Spatial Grid",
  description: "Next-generation EV corridor and charging station navigation with Uber H3 spatial analysis across India.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-900 text-gray-100 antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}

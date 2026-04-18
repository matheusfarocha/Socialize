import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="ml-64 flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    </>
  );
}

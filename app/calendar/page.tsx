import Nav from "@/components/Nav";
import CalendarView from "@/components/CalendarView";

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Nav />
      <div className="flex-1 overflow-auto p-4">
        <CalendarView />
      </div>
    </div>
  );
}

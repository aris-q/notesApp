import Nav from "@/components/Nav";
import TasksShell from "@/components/TasksShell";

export default function TasksPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Nav />
      <TasksShell />
    </div>
  );
}

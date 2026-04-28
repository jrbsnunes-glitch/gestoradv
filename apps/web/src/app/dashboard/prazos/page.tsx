import { redirect } from 'next/navigation';

export default function PrazosPageRedirect() {
  redirect('/dashboard/tarefas?tab=prazos');
}

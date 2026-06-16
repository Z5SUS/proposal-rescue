import { createRoot } from 'react-dom/client';
import '@/styles/global.css';
import { Dashboard } from '@/dashboard/Dashboard';

const root = createRoot(document.getElementById('root')!);
root.render(<Dashboard />);

import type { Metadata } from 'next';
import './globals.css';
import FeedbackHost from '@/components/ui/feedback-host';
export const metadata: Metadata = { title: 'SGA | Gestión Administrativa', description: 'Sistema de Gestión Administrativa institucional', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) { return <html lang="es-AR"><body>{children}<FeedbackHost/></body></html>; }

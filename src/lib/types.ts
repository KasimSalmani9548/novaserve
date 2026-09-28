export type Role = 'ADMIN' | 'CUSTOMER';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'DOCUMENT_REQUIRED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export interface User { id: string; role: Role; name: string; email: string; mobile?: string; active: boolean; address?: string; photo?: string; }
export interface Category { id: string; name: string; active: boolean; }
export interface Service { id: string; name: string; description: string; categoryId: string; price: number; icon: string; active: boolean; requiresDocuments?: boolean; documentHint?: string; }
export interface Order { id: string; customerId: string; customerName: string; serviceId: string; serviceName: string; amount: number; status: OrderStatus; formData: Record<string, string>; adminNote: string; timeline: { status: OrderStatus; at: string; note?: string }[]; createdAt: string; updatedAt: string; }
export interface Wallet { userId: string; balance: number; totalAdded: number; totalSpent: number; }
export interface WalletTxn { id: string; userId: string; type: 'CREDIT' | 'DEBIT'; amount: number; note: string; balanceAfter: number; createdAt: string; }
export interface Notification { id: string; userId: string; title: string; message: string; orderId?: string; read: boolean; createdAt: string; }
export interface SupportTicket { id: string; userId: string; userName: string; subject: string; message: string; orderId?: string; status: 'OPEN' | 'RESOLVED' | 'CLOSED'; createdAt: string; }

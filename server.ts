import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_PERMISSION_MODULES,
  ALL_PERMISSION_CODES,
  DB_PERMISSION_GROUPS,
  DB_PERMISSIONS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  StoredUser,
  AuditLog
} from './server/data';
import { Role, User } from './src/types';

// In-memory data store with live mutability
let users: StoredUser[] = JSON.parse(JSON.stringify(INITIAL_USERS));
let roles: Role[] = JSON.parse(JSON.stringify(INITIAL_ROLES));
let auditLogs: AuditLog[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));

interface ServerDocumentType {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  template_url: string;
  template_filename: string;
  template_type: 'excel' | 'docx' | 'pdf';
  template_size: string;
}

interface ServerUploadedDoc {
  id: string;
  title: string;
  documentTypeId: string;
  documentTypeName: string;
  category: string;
  size: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  fileType: string;
  date: string;
  createdAt: string;
  uploadedBy: string;
  status: 'active' | 'archived';
  source?: 'computer' | 'device' | 'camera';
}

const INITIAL_DOCUMENT_TYPES: ServerDocumentType[] = [
  {
    id: 'dt_1',
    name: 'Hợp đồng kinh tế & thương mại',
    code: 'HD_KT',
    category: 'Hợp đồng',
    description: 'Hợp đồng mua bán hàng hóa, cung cấp dịch vụ thương mại doanh nghiệp',
    template_url: '/api/document-types/template/Bieu_Mau_Hop_Dong_Kinh_Te_2026.docx',
    template_filename: 'Bieu_Mau_Hop_Dong_Kinh_Te_2026.docx',
    template_type: 'docx',
    template_size: '142 KB'
  },
  {
    id: 'dt_2',
    name: 'Hóa đơn giá trị gia tăng & bảng kê thanh toán',
    code: 'HD_VAT',
    category: 'Tài chính - Kế toán',
    description: 'Hóa đơn điện tử GTGT, biên lai thu phí và ủy nhiệm chi ngân hàng',
    template_url: '/api/document-types/template/Bang_Ke_Hoa_Don_VAT_Dien_Tu.xlsx',
    template_filename: 'Bang_Ke_Hoa_Don_VAT_Dien_Tu.xlsx',
    template_type: 'excel',
    template_size: '88 KB'
  },
  {
    id: 'dt_3',
    name: 'Biên bản nghiệm thu & bàn giao công việc',
    code: 'BB_NT',
    category: 'Kỹ thuật - Vận hành',
    description: 'Biên bản xác nhận khối lượng hoàn thành và bàn giao hạng mục công trình',
    template_url: '/api/document-types/template/Bien_Ban_Nghiem_Thu_Ban_Giao_V3.docx',
    template_filename: 'Bien_Ban_Nghiem_Thu_Ban_Giao_V3.docx',
    template_type: 'docx',
    template_size: '96 KB'
  },
  {
    id: 'dt_4',
    name: 'Hồ sơ nhân sự & hợp đồng lao động',
    code: 'HS_HR',
    category: 'Nhân sự',
    description: 'Sơ yếu lý lịch, bằng cấp, hợp đồng thử việc và quyết định tiếp nhận',
    template_url: '/api/document-types/template/Mau_So_Yeu_Ly_Lich_Nhan_Su.pdf',
    template_filename: 'Mau_So_Yeu_Ly_Lich_Nhan_Su.pdf',
    template_type: 'pdf',
    template_size: '265 KB'
  },
  {
    id: 'dt_5',
    name: 'Giấy đề nghị tạm ứng / thanh toán chi phí',
    code: 'GDN_TT',
    category: 'Tài chính - Kế toán',
    description: 'Phiếu xin phê duyệt tạm ứng công tác phí hoặc quyết toán ngân sách dự án',
    template_url: '/api/document-types/template/Giay_De_Nghi_Tam_Ung_Thanh_Toan.xlsx',
    template_filename: 'Giay_De_Nghi_Tam_Ung_Thanh_Toan.xlsx',
    template_type: 'excel',
    template_size: '64 KB'
  },
  {
    id: 'dt_6',
    name: 'Tờ trình phê duyệt chủ trương dự án',
    code: 'TT_PD',
    category: 'Ban Giám Đốc',
    description: 'Văn bản trình lãnh đạo phê duyệt chủ trương triển khai và hạn mức tài chính',
    template_url: '/api/document-types/template/To_Trinh_Phe_Duyet_Chu_Truong_2026.pdf',
    template_filename: 'To_Trinh_Phe_Duyet_Chu_Truong_2026.pdf',
    template_type: 'pdf',
    template_size: '315 KB'
  }
];

let documentTypes: ServerDocumentType[] = JSON.parse(JSON.stringify(INITIAL_DOCUMENT_TYPES));
let uploadedDocuments: ServerUploadedDoc[] = [
  {
    id: 'doc_1',
    title: 'Hợp đồng cung cấp dịch vụ an toàn mạng 2026',
    documentTypeId: 'dt_1',
    documentTypeName: 'Hợp đồng kinh tế & thương mại',
    category: 'Hợp đồng',
    size: '1.4 MB',
    fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=200&auto=format&fit=crop&q=80',
    fileName: 'Hop_dong_kinh_te_scan_p1.jpg',
    fileType: 'image/jpeg',
    date: '2026-03-01',
    createdAt: '2026-03-01T14:20:00.000Z',
    uploadedBy: 'admin@system.com',
    status: 'active',
    source: 'computer'
  },
  {
    id: 'doc_2',
    title: 'Biên lai lệ phí kiểm định hạ tầng máy chủ',
    documentTypeId: 'dt_2',
    documentTypeName: 'Hóa đơn giá trị gia tăng & bảng kê thanh toán',
    category: 'Tài chính - Kế toán',
    size: '850 KB',
    fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&auto=format&fit=crop&q=80',
    fileName: 'Hoa_don_GTGT_002391.png',
    fileType: 'image/png',
    date: '2026-03-03',
    createdAt: '2026-03-03T09:15:00.000Z',
    uploadedBy: 'manager@system.com',
    status: 'active',
    source: 'device'
  },
  {
    id: 'doc_3',
    title: 'Biên bản nghiệm thu phân hệ Quản lý Phân quyền',
    documentTypeId: 'dt_3',
    documentTypeName: 'Biên bản nghiệm thu & bàn giao công việc',
    category: 'Kỹ thuật - Vận hành',
    size: '2.1 MB',
    fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    fileName: 'Bien_ban_nghiem_thu_ky_nhan.jpg',
    fileType: 'image/jpeg',
    date: '2026-03-05',
    createdAt: '2026-03-05T16:45:00.000Z',
    uploadedBy: 'admin@system.com',
    status: 'active',
    source: 'camera'
  },
  {
    id: 'doc_4',
    title: 'Hồ sơ sơ yếu lý lịch nhân sự Đặng Tuấn Anh',
    documentTypeId: 'dt_4',
    documentTypeName: 'Hồ sơ nhân sự & hợp đồng lao động',
    category: 'Nhân sự',
    size: '1.8 MB',
    fileUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&auto=format&fit=crop&q=80',
    fileName: 'So_yeu_ly_lich_Dang_Tuan_Anh.jpg',
    fileType: 'image/jpeg',
    date: '2026-03-06',
    createdAt: '2026-03-06T10:00:00.000Z',
    uploadedBy: 'admin@system.com',
    status: 'active',
    source: 'computer'
  },
  {
    id: 'doc_5',
    title: 'Giấy đề nghị tạm ứng công tác phí Quý 1/2026',
    documentTypeId: 'dt_5',
    documentTypeName: 'Giấy đề nghị tạm ứng / thanh toán chi phí',
    category: 'Tài chính - Kế toán',
    size: '920 KB',
    fileUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=200&auto=format&fit=crop&q=80',
    fileName: 'Giay_de_nghi_tam_ung_Q1.png',
    fileType: 'image/png',
    date: '2026-03-06',
    createdAt: '2026-03-06T11:20:00.000Z',
    uploadedBy: 'manager@system.com',
    status: 'active',
    source: 'device'
  },
  {
    id: 'doc_6',
    title: 'Tờ trình phê duyệt chủ trương nâng cấp Cloud 2026',
    documentTypeId: 'dt_6',
    documentTypeName: 'Tờ trình phê duyệt chủ trương dự án',
    category: 'Ban Giám Đốc',
    size: '2.5 MB',
    fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=200&auto=format&fit=crop&q=80',
    fileName: 'To_trinh_chu_truong_nang_cap.pdf',
    fileType: 'image/jpeg',
    date: '2026-03-07',
    createdAt: '2026-03-07T08:30:00.000Z',
    uploadedBy: 'admin@system.com',
    status: 'active',
    source: 'camera'
  },
  {
    id: 'doc_7',
    title: 'Hợp đồng bảo trì phần mềm kế toán ERP',
    documentTypeId: 'dt_1',
    documentTypeName: 'Hợp đồng kinh tế & thương mại',
    category: 'Hợp đồng',
    size: '1.6 MB',
    fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&auto=format&fit=crop&q=80',
    fileName: 'HD_Bao_Tri_ERP_2026.jpg',
    fileType: 'image/jpeg',
    date: '2026-03-07',
    createdAt: '2026-03-07T14:10:00.000Z',
    uploadedBy: 'staff@system.com',
    status: 'active',
    source: 'computer'
  },
  {
    id: 'doc_8',
    title: 'Biên lai chuyển khoản cọc thuê văn phòng chi nhánh',
    documentTypeId: 'dt_2',
    documentTypeName: 'Hóa đơn giá trị gia tăng & bảng kê thanh toán',
    category: 'Tài chính - Kế toán',
    size: '780 KB',
    fileUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&auto=format&fit=crop&q=80',
    fileName: 'Uy_nhiem_chi_coc_van_phong.png',
    fileType: 'image/png',
    date: '2026-03-08',
    createdAt: '2026-03-08T09:00:00.000Z',
    uploadedBy: 'manager@system.com',
    status: 'active',
    source: 'device'
  }
];

export interface ServerEmployee {
  id: string;
  code: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'probation' | 'resigned';
}

let employees: ServerEmployee[] = [
  {
    id: 'emp_1',
    code: 'HR-001',
    name: 'Nguyễn Văn Hùng',
    position: 'Chuyên viên Tuyển dụng Cao cấp',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'hung.nguyen@company.com',
    phone: '0912 345 678',
    joinDate: '2024-03-15',
    status: 'active'
  },
  {
    id: 'emp_2',
    code: 'HR-002',
    name: 'Phạm Thu Trang',
    position: 'Chuyên viên C&B (Lương & Phúc Lợi)',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'trang.pham@company.com',
    phone: '0988 765 432',
    joinDate: '2024-08-01',
    status: 'active'
  },
  {
    id: 'emp_3',
    code: 'HR-003',
    name: 'Vũ Quốc Bảo',
    position: 'Thực tập sinh Nhân sự',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'bao.vu@company.com',
    phone: '0977 123 999',
    joinDate: '2026-01-10',
    status: 'probation'
  },
  {
    id: 'emp_4',
    code: 'HR-004',
    name: 'Lê Minh Tâm',
    position: 'Trưởng phòng Đào tạo & Phát triển',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'tam.le@company.com',
    phone: '0903 112 233',
    joinDate: '2023-05-20',
    status: 'active'
  },
  {
    id: 'emp_5',
    code: 'HR-005',
    name: 'Đoàn Kim Oanh',
    position: 'Chuyên viên Truyền thông Nội bộ',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'oanh.doan@company.com',
    phone: '0934 556 778',
    joinDate: '2025-02-15',
    status: 'active'
  },
  {
    id: 'emp_6',
    code: 'HR-006',
    name: 'Trần Gia Huy',
    position: 'Chuyên viên Quan hệ Lao động',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'huy.tran@company.com',
    phone: '0918 889 900',
    joinDate: '2025-09-01',
    status: 'active'
  },
  {
    id: 'emp_7',
    code: 'HR-007',
    name: 'Bùi Diệu Linh',
    position: 'Cộng tác viên Tuyển dụng IT',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'linh.bui@company.com',
    phone: '0966 223 344',
    joinDate: '2026-02-01',
    status: 'probation'
  },
  {
    id: 'emp_8',
    code: 'HR-008',
    name: 'Ngô Kiến Quốc',
    position: 'Chuyên viên Phân tích Dữ liệu Nhân sự',
    department: 'Ban Nhân Sự & Đào Tạo',
    email: 'quoc.ngo@company.com',
    phone: '0945 667 889',
    joinDate: '2024-11-12',
    status: 'active'
  }
];


function sanitizeUser(u: StoredUser): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = u;
  return safe;
}

function getRoleById(roleId: string): Role {
  const role = roles.find((r) => r.id === roleId);
  if (role) return role;
  return {
    id: roleId,
    name: 'Tùy Chỉnh',
    description: 'Vai trò tùy chỉnh',
    permissions: []
  };
}

function recordLog(action: string, detail: string, performedBy: string, req: Request) {
  const log: AuditLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    action,
    detail,
    performedBy,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1'
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 50) auditLogs.pop();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const REMOTE_BACKEND_URL = process.env.BACKEND_API_URL || 'https://letran-portal-backend.onrender.com/api/v1';

  // 0. PROXY /api/v1 SANG REAL BACKEND (https://letran-portal-backend.onrender.com/api/v1)
  // Cho phép gọi API backend thật mà không bị lỗi CORS chặn trên trình duyệt
  app.use('/api/v1', async (req: Request, res: Response) => {
    const subPath = req.url; // e.g. /auth/login hoặc /auth/login?query=...
    const targetUrl = `${REMOTE_BACKEND_URL.replace(/\/$/, '')}${subPath.startsWith('/') ? subPath : '/' + subPath}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const backendResponse = await fetch(targetUrl, fetchOptions);
      const contentType = backendResponse.headers.get('content-type') || '';

      res.status(backendResponse.status);

      if (contentType.includes('application/json')) {
        const data = await backendResponse.json();
        res.json(data);
      } else {
        const text = await backendResponse.text();
        res.send(text);
      }
    } catch (error: any) {
      console.error(`[Proxy Error] ${req.method} ${targetUrl}:`, error?.message);
      res.status(502).json({
        success: false,
        statusCode: 502,
        error: {
          code: 'BAD_GATEWAY',
          message: `Không thể kết nối đến backend thật tại ${targetUrl}: ${error?.message || 'Lỗi kết nối'}`
        }
      });
    }
  });

  // Simulated latency endpoint for testing anti-flicker loading overlay
  app.get('/api/test/delay', (req: Request, res: Response) => {
    const ms = parseInt(req.query.ms as string, 10) || 500;
    const name = (req.query.name as string) || 'API task';
    setTimeout(() => {
      res.json({ success: true, delayedMs: ms, name, timestamp: new Date().toISOString() });
    }, ms);
  });

  // 1. LOGIN API
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ email và mật khẩu' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user || user.passwordHash !== password) {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ success: false, message: 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Admin.' });
      return;
    }

    // REQUIREMENT: Nếu user trả về là is_first_login thì phản hồi yêu cầu đổi mật khẩu
    if (user.is_first_login) {
      recordLog('LOGIN_FIRST_ATTEMPT', `Người dùng ${user.email} đăng nhập lần đầu (yêu cầu đổi mật khẩu)`, user.email, req);
      res.json({
        success: true,
        is_first_login: true,
        message: 'Tài khoản đăng nhập lần đầu. Bạn bắt buộc phải đổi mật khẩu để tiếp tục.',
        user: sanitizeUser(user)
      });
      return;
    }

    // Normal Login Success
    const role = getRoleById(user.roleId);
    const token = 'jwt_token_' + Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    recordLog('LOGIN_SUCCESS', `Người dùng ${user.email} đăng nhập thành công với vai trò ${role.name}`, user.email, req);

    res.json({
      success: true,
      is_first_login: false,
      token,
      user: sanitizeUser(user),
      role,
      permissions: role.permissions,
      message: 'Đăng nhập thành công'
    });
  });

  // 2. CHANGE PASSWORD FIRST LOGIN API
  // REQUIREMENT: Đổi mật khẩu xong sẽ call api cập nhật is_first_login = false rồi call api login luôn
  app.post('/api/auth/change-password-first-login', (req: Request, res: Response) => {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin mật khẩu' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    const user = users[userIndex];

    if (user.passwordHash !== currentPassword) {
      res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }

    if (newPassword === currentPassword) {
      res.status(400).json({ success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ' });
      return;
    }

    // Update password and update is_first_login = false
    users[userIndex].passwordHash = newPassword;
    users[userIndex].is_first_login = false;

    recordLog(
      'UPDATE_FIRST_LOGIN_PASSWORD',
      `Đổi mật khẩu lần đầu thành công cho tài khoản ${user.email}. Đã cập nhật is_first_login = false.`,
      user.email,
      req
    );

    res.json({
      success: true,
      message: 'Đã cập nhật mật khẩu mới thành công và tắt cờ is_first_login = false',
      is_first_login: false,
      email: user.email
    });
  });

  // 3. GET CURRENT USER & SESSION
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const emailHeader = req.headers['x-user-email'] as string;

    let user: StoredUser | undefined;
    if (emailHeader) {
      user = users.find((u) => u.email.toLowerCase() === emailHeader.toLowerCase());
    } else if (authHeader && authHeader.startsWith('Bearer jwt_token_')) {
      try {
        const decoded = Buffer.from(authHeader.replace('Bearer jwt_token_', ''), 'base64').toString('ascii');
        const [userId] = decoded.split(':');
        user = users.find((u) => u.id === userId);
      } catch {
        // invalid token
      }
    }

    if (!user) {
      // Default to admin for convenient inspection if requested
      user = users.find((u) => u.roleId === 'admin');
    }

    if (!user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      return;
    }

    const role = getRoleById(user.roleId);
    res.json({
      success: true,
      user: sanitizeUser(user),
      role,
      permissions: role.permissions
    });
  });

  // 4. PERMISSIONS API (Danh sách tất cả các quyền truy cập có cấu trúc Module và dữ liệu bảng Supabase)
  app.get('/api/permissions', (_req: Request, res: Response) => {
    res.json({
      success: true,
      modules: INITIAL_PERMISSION_MODULES,
      permission_groups: DB_PERMISSION_GROUPS,
      permissions: DB_PERMISSIONS,
      allCodes: ALL_PERMISSION_CODES,
      totalCount: ALL_PERMISSION_CODES.length
    });
  });

  app.get('/api/permission-groups', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: DB_PERMISSION_GROUPS
    });
  });

  // 5. ROLES API (Danh sách vai trò kèm các quyền đã được gán)
  app.get('/api/roles', (_req: Request, res: Response) => {
    res.json({
      success: true,
      roles
    });
  });

  // Create new role
  app.post('/api/roles', (req: Request, res: Response) => {
    const { name, description, permissions = [] } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Tên vai trò không được để trống' });
      return;
    }

    const id = 'role_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    const newRole: Role = {
      id,
      name,
      description: description || 'Vai trò tùy chỉnh mới tạo',
      isSystem: false,
      permissions,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };

    roles.push(newRole);
    recordLog('CREATE_ROLE', `Tạo vai trò mới "${name}" với ${permissions.length} quyền`, 'admin@system.com', req);

    res.status(201).json({
      success: true,
      message: `Đã tạo vai trò "${name}" thành công`,
      role: newRole
    });
  });

  // Update permissions for a specific role
  app.put('/api/roles/:id/permissions', (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ success: false, message: 'Danh sách quyền không hợp lệ' });
      return;
    }

    const roleIndex = roles.findIndex((r) => r.id === id);
    if (roleIndex === -1) {
      res.status(404).json({ success: false, message: 'Không tìm thấy vai trò' });
      return;
    }

    // Update role permissions
    roles[roleIndex].permissions = permissions;

    recordLog(
      'UPDATE_ROLE_PERMISSIONS',
      `Cập nhật ma trận phân quyền cho vai trò "${roles[roleIndex].name}": ${permissions.length} quyền được chọn`,
      'admin@system.com',
      req
    );

    res.json({
      success: true,
      message: `Đã lưu cập nhật phân quyền cho vai trò "${roles[roleIndex].name}"`,
      role: roles[roleIndex]
    });
  });

  // Delete role
  app.delete('/api/roles/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const role = roles.find((r) => r.id === id);
    if (!role) {
      res.status(404).json({ success: false, message: 'Không tìm thấy vai trò' });
      return;
    }
    if (role.isSystem || role.id === 'admin') {
      res.status(400).json({ success: false, message: 'Không thể xóa vai trò mặc định của hệ thống' });
      return;
    }

    roles = roles.filter((r) => r.id !== id);
    recordLog('DELETE_ROLE', `Xóa vai trò "${role.name}"`, 'admin@system.com', req);

    res.json({ success: true, message: `Đã xóa vai trò "${role.name}"` });
  });

  // 6. USERS MANAGEMENT API (Server-side search & pagination)
  app.get('/api/users', (req: Request, res: Response) => {
    let list = users.map(sanitizeUser);

    // 1. Server Search
    const search = ((req.query.search || req.query.q || '') as string).trim().toLowerCase();
    if (search) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          (u.department && u.department.toLowerCase().includes(search)) ||
          u.roleId.toLowerCase().includes(search)
      );
    }

    // 2. Role Filter
    const roleId = ((req.query.roleId || '') as string).trim();
    if (roleId && roleId !== 'all') {
      list = list.filter((u) => u.roleId === roleId);
    }

    // 3. Server Pagination
    const total = list.length;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const validPage = Math.min(page, totalPages);
    const startIndex = (validPage - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      users: paginated,
      data: paginated,
      pagination: {
        page: validPage,
        limit,
        total,
        totalPages,
        hasPrevPage: validPage > 1,
        hasNextPage: validPage < totalPages
      }
    });
  });

  // Create new user
  app.post('/api/users', (req: Request, res: Response) => {
    const { email, name, roleId = 'staff', department, is_first_login = true, password = 'Password@123' } = req.body;

    if (!email || !name) {
      res.status(400).json({ success: false, message: 'Email và họ tên là bắt buộc' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(400).json({ success: false, message: 'Email đã tồn tại trên hệ thống' });
      return;
    }

    const newUser: StoredUser = {
      id: 'usr_' + Date.now().toString(36),
      email: cleanEmail,
      name,
      roleId,
      is_first_login: Boolean(is_first_login),
      department: department || 'Phòng ban chung',
      status: 'active',
      passwordHash: password,
      createdAt: new Date().toISOString(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`
    };

    users.push(newUser);
    recordLog(
      'CREATE_USER',
      `Tạo tài khoản ${cleanEmail} (is_first_login=${newUser.is_first_login}, role=${roleId})`,
      'admin@system.com',
      req
    );

    res.status(201).json({
      success: true,
      message: 'Đã tạo tài khoản thành công',
      user: sanitizeUser(newUser)
    });
  });

  // Update user role or status
  app.put('/api/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { roleId, status, department, name } = req.body;

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    if (roleId) users[userIndex].roleId = roleId;
    if (status) users[userIndex].status = status;
    if (department) users[userIndex].department = department;
    if (name) users[userIndex].name = name;

    res.json({
      success: true,
      message: 'Cập nhật thông tin người dùng thành công',
      user: sanitizeUser(users[userIndex])
    });
  });

  // Reset user to is_first_login = true (for easy demo testing)
  app.post('/api/users/:id/reset-first-login', (req: Request, res: Response) => {
    const { id } = req.params;
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    const defaultTempPass = 'Temp@12345';
    users[userIndex].is_first_login = true;
    users[userIndex].passwordHash = defaultTempPass;

    recordLog(
      'RESET_FIRST_LOGIN_FLAG',
      `Admin đặt lại cờ is_first_login=true và mật khẩu tạm ${defaultTempPass} cho ${users[userIndex].email}`,
      'admin@system.com',
      req
    );

    res.json({
      success: true,
      message: `Đã đặt lại cờ is_first_login = true cho ${users[userIndex].email}. Mật khẩu tạm: ${defaultTempPass}`,
      user: sanitizeUser(users[userIndex]),
      tempPassword: defaultTempPass
    });
  });

  // 7. DOCUMENT TYPES API (Cho ô Autocomplete & tải file template mẫu)
  app.get('/api/document-types', (req: Request, res: Response) => {
    const q = (req.query.q as string || '').toLowerCase().trim();
    if (!q) {
      res.json({ success: true, data: documentTypes });
      return;
    }
    const filtered = documentTypes.filter(
      (dt) =>
        dt.name.toLowerCase().includes(q) ||
        dt.code.toLowerCase().includes(q) ||
        dt.category.toLowerCase().includes(q) ||
        dt.description.toLowerCase().includes(q)
    );
    res.json({ success: true, data: filtered });
  });

  // Tải file template mẫu (Excel, Word, PDF)
  app.get('/api/document-types/template/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;
    const docType = documentTypes.find((dt) => dt.template_filename === filename);

    // Xác định mime-type theo đuôi file
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.xlsx')) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (filename.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (filename.endsWith('.pdf')) contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Nội dung mẫu dạng text/buffer tiêu chuẩn có thể mở được
    const sampleContent = Buffer.from(
      `BIỂU MẪU CHUẨN DOANH NGHIỆP - HỆ THỐNG QUẢN TRỊ 2026\n` +
      `Tên tài liệu: ${docType?.name || filename}\n` +
      `Mã tài liệu: ${docType?.code || 'DOC_STD'}\n` +
      `Loại file: ${docType?.template_type?.toUpperCase() || 'DOCUMENT'}\n` +
      `Ngày ban hành: 01/01/2026\n` +
      `Quy chuẩn: ISO 9001:2015 & An toàn bảo mật thông tin\n\n` +
      `Vui lòng điền thông tin và ký xác nhận theo mẫu này.`
    );
    res.send(sampleContent);
  });

  // 8. DOCUMENTS API (Server-side search & pagination)
  app.get('/api/documents', (req: Request, res: Response) => {
    let list = [...uploadedDocuments];

    // 1. Server Search
    const search = ((req.query.search || req.query.q || '') as string).trim().toLowerCase();
    if (search) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          d.documentTypeName.toLowerCase().includes(search) ||
          d.category.toLowerCase().includes(search) ||
          d.fileName.toLowerCase().includes(search) ||
          (d.uploadedBy && d.uploadedBy.toLowerCase().includes(search)) ||
          d.date.includes(search)
      );
    }

    // 2. Filter Document Type
    const documentTypeId = ((req.query.documentTypeId || '') as string).trim();
    if (documentTypeId && documentTypeId !== 'all') {
      list = list.filter((d) => d.documentTypeId === documentTypeId);
    }

    // 3. Server Pagination
    const total = list.length;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 5);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const validPage = Math.min(page, totalPages);
    const startIndex = (validPage - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: validPage,
        limit,
        total,
        totalPages,
        hasPrevPage: validPage > 1,
        hasNextPage: validPage < totalPages
      }
    });
  });

  // API upload từng bức ảnh với xử lý lưu trữ BE (có mô phỏng trễ 350ms để theo dõi thanh Progress Bar)
  app.post('/api/documents/upload-single', (req: Request, res: Response) => {
    const {
      documentTypeId,
      documentTypeName,
      fileName,
      fileSize,
      fileType,
      imageBase64,
      source,
      index,
      total
    } = req.body;

    if (!fileName) {
      res.status(400).json({ success: false, message: 'Thiếu thông tin tệp tin hình ảnh' });
      return;
    }

    const docType = documentTypes.find((dt) => dt.id === documentTypeId);
    const categoryName = docType?.category || 'Tài liệu nghiệp vụ';
    const typeName = documentTypeName || docType?.name || 'Tài liệu ảnh';

    // Mô phỏng thời gian BE xử lý lưu file, nén ảnh, tạo hash mã hóa (khoảng 350ms)
    setTimeout(() => {
      const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const sizeStr = fileSize
        ? (fileSize / (1024 * 1024) >= 1
            ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(fileSize / 1024)} KB`)
        : '1.2 MB';

      const newDoc: ServerUploadedDoc = {
        id: docId,
        title: `${typeName} - ${fileName.replace(/\.[^/.]+$/, '')}`,
        documentTypeId: documentTypeId || 'dt_1',
        documentTypeName: typeName,
        category: categoryName,
        size: sizeStr,
        fileUrl: imageBase64 || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
        thumbnailUrl: imageBase64 || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200',
        fileName: fileName,
        fileType: fileType || 'image/jpeg',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        uploadedBy: 'admin@system.com',
        status: 'active',
        source: source || 'computer'
      };

      uploadedDocuments.unshift(newDoc);

      recordLog(
        'DOCUMENT_IMAGE_UPLOAD',
        `Tải lên hình ảnh "${fileName}" (${index !== undefined && total ? `ảnh ${Number(index) + 1}/${total}` : '1 ảnh'}) vào loại "${typeName}"`,
        'admin@system.com',
        req
      );

      res.json({
        success: true,
        message: `Đã lưu thành công ảnh "${fileName}" lên máy chủ`,
        data: newDoc,
        progress: {
          savedIndex: index !== undefined ? Number(index) + 1 : 1,
          total: total || 1
        }
      });
    }, 350);
  });

  // Xóa tài liệu
  app.delete('/api/documents/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const docIndex = uploadedDocuments.findIndex((d) => d.id === id);
    if (docIndex === -1) {
      res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu' });
      return;
    }
    const [deleted] = uploadedDocuments.splice(docIndex, 1);
    recordLog('DOCUMENT_DELETE', `Xóa tài liệu "${deleted.title}" (ID: ${deleted.id})`, 'admin@system.com', req);
    res.json({ success: true, message: `Đã xóa tài liệu "${deleted.title}"` });
  });

  // API Xuất File từ Backend (Sau khi lưu tất cả ảnh thành công)
  app.post('/api/documents/export-package', (req: Request, res: Response) => {
    const {
      documentTypeId,
      documentTypeName,
      documentTypeCode,
      imageFiles = [],
      format = 'pdf',
      exportTitle
    } = req.body;

    const docType = documentTypes.find((dt) => dt.id === documentTypeId);
    const code = documentTypeCode || docType?.code || 'DOC';
    const typeName = documentTypeName || docType?.name || 'Hồ sơ chứng từ';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // Tên file xuất
    const ext = format === 'excel' ? 'xlsx' : format === 'docx' ? 'docx' : 'pdf';
    const filename = `Ho_So_Xuat_${code}_${timestamp}.${ext}`;

    let contentType = 'application/pdf';
    let fileBuffer: Buffer;

    if (format === 'excel') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      // Tạo file bảng tính chuẩn UTF-8 CSV/TSV mở trực tiếp trong Excel
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const header = `BẢNG KÊ DANH MỤC HÌNH ẢNH HỒ SƠ CHỨNG TỪ SỐ HÓA\n`;
      const meta =
        `Loại tài liệu:;${typeName}\n` +
        `Mã tài liệu:;${code}\n` +
        `Ngày xuất file:;${dateStr}\n` +
        `Tổng số ảnh đã lưu:;${imageFiles.length}\n` +
        `Người thực hiện:;admin@system.com\n` +
        `Hệ thống:;Quản Trị Phân Quyền & Lưu Trữ Hồ Sơ Doanh Nghiệp\n\n`;
      const tableHeader = `STT;Tên Tệp Ảnh;Dung Lượng;Nguồn Upload;Thời Gian Lưu;Trạng Thái BE;Mã Hash Bảo Mật\n`;

      const rows = (imageFiles as Array<{ name: string; sizeFormatted: string; source?: string }>).map((img, idx) => {
        const hash = 'SHA256_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        return `${idx + 1};${img.name};${img.sizeFormatted || '1.2 MB'};${img.source || 'computer'};${dateStr};ĐÃ LƯU TRỮ AN TOÀN;${hash}`;
      }).join('\n');

      fileBuffer = Buffer.concat([bom, Buffer.from(header + meta + tableHeader + rows, 'utf-8')]);
    } else if (format === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const docHeader =
        `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\n` +
        `BIÊN BẢN BÀN GIAO & TỔNG HỢP HỒ SƠ CHỨNG TỪ ĐIỆN TỬ\n` +
        `Số: ${code}/${new Date().getFullYear()}/BB-SH\n\n` +
        `I. THÔNG TIN HỒ SƠ:\n` +
        `- Tên loại hồ sơ: ${typeName}\n` +
        `- Mã định danh: ${code}\n` +
        `- Thời gian hoàn tất số hóa: ${dateStr}\n` +
        `- Số lượng ảnh chứng từ: ${imageFiles.length} hình ảnh\n\n` +
        `II. DANH MỤC CÁC HÌNH ẢNH ĐÃ LƯU TRỮ VÀO CƠ SỞ DỮ LIỆU:\n`;

      const fileList = (imageFiles as Array<{ name: string; sizeFormatted: string; source?: string }>).map((img, idx) => {
        return `  ${idx + 1}. ${img.name} - Dung lượng: ${img.sizeFormatted || '1.2 MB'} (Nguồn: ${img.source || 'computer'}) [ĐÃ XÁC THỰC LƯU TRỮ]`;
      }).join('\n');

      const footer =
        `\n\nIII. KẾT LUẬN & XÁC NHẬN:\n` +
        `Toàn bộ dữ liệu hình ảnh trên đã được tiếp nhận, kiểm tra toàn vẹn và mã hóa lưu trữ trên hệ thống máy chủ an toàn.\n\n` +
        `Người lập hồ sơ: admin@system.com\nChữ ký số: VERIFIED_DIGITAL_SIGNATURE_${Date.now()}`;

      fileBuffer = Buffer.from(docHeader + fileList + footer, 'utf-8');
    } else {
      // PDF Format (Chuẩn PDF-1.4 có thể mở trực tiếp trong mọi PDF viewer)
      contentType = 'application/pdf';

      const streamLines: string[] = [
        `BT`,
        `/F1 16 Tf`,
        `50 740 Td`,
        `(${code} - HO SO TONG HOP CHUNG TU DIEN TU) Tj`,
        `/F1 10 Tf`,
        `0 -25 Td`,
        `(Loai tai lieu: ${typeName.replace(/[()]/g, '')}) Tj`,
        `0 -15 Td`,
        `(Thoi gian xuat: ${dateStr}) Tj`,
        `0 -15 Td`,
        `(Tong so hinh anh da luu tru thanh cong: ${imageFiles.length} tap tin) Tj`,
        `0 -15 Td`,
        `(Nguoi xuat: admin@system.com - Trang thai: DA XAC THUC SO HOA) Tj`,
        `0 -30 Td`,
        `/F1 11 Tf`,
        `(DANH SACH CAC TEIP HINH ANH DA LUU TRU TREN MAY CHU:) Tj`,
        `/F1 9 Tf`
      ];

      (imageFiles as Array<{ name: string; sizeFormatted: string }>).slice(0, 20).forEach((img, idx) => {
        const cleanName = img.name.replace(/[()]/g, '');
        streamLines.push(`0 -16 Td`);
        streamLines.push(`([#${idx + 1}] ${cleanName} - ${img.sizeFormatted || '1.2 MB'} - Luu thanh cong BE) Tj`);
      });

      streamLines.push(`0 -35 Td`);
      streamLines.push(`/F1 9 Tf`);
      streamLines.push(`(--- CHUNG TU DUOC XUAT TU HE THONG QUAN TRI PHAN QUYEN VA LUU TRU DOANH NGHIEP ---) Tj`);
      streamLines.push(`ET`);

      const streamContent = streamLines.join('\n');
      const streamLength = Buffer.byteLength(streamContent);

      const pdfText =
        `%PDF-1.4\n` +
        `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
        `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n` +
        `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n` +
        `5 0 obj\n<< /Length ${streamLength} >>\nstream\n` +
        `${streamContent}\n` +
        `endstream\nendobj\n` +
        `xref\n0 6\n` +
        `0000000000 65535 f \n` +
        `0000000009 00000 n \n` +
        `0000000058 00000 n \n` +
        `0000000115 00000 n \n` +
        `0000000244 00000 n \n` +
        `0000000325 00000 n \n` +
        `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${400 + streamLength}\n%%EOF\n`;

      fileBuffer = Buffer.from(pdfText, 'utf-8');
    }

    recordLog(
      'DOCUMENT_EXPORT',
      `Xuất tệp hồ sơ "${filename}" (${imageFiles.length} hình ảnh) định dạng ${format.toUpperCase()} cho loại "${typeName}"`,
      'admin@system.com',
      req
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(fileBuffer);
  });

  // 9. AUDIT LOGS (Server-side search & pagination)
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    let list = [...auditLogs];

    // 1. Server Search
    const search = ((req.query.search || req.query.q || '') as string).trim().toLowerCase();
    if (search) {
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(search) ||
          l.detail.toLowerCase().includes(search) ||
          l.performedBy.toLowerCase().includes(search) ||
          l.ip.toLowerCase().includes(search)
      );
    }

    // 2. Server Pagination
    const total = list.length;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const validPage = Math.min(page, totalPages);
    const startIndex = (validPage - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      logs: paginated,
      data: paginated,
      pagination: {
        page: validPage,
        limit,
        total,
        totalPages,
        hasPrevPage: validPage > 1,
        hasNextPage: validPage < totalPages
      }
    });
  });

  // 10. HR EMPLOYEES API (Server-side search & pagination)
  app.get('/api/employees', (req: Request, res: Response) => {
    let list = [...employees];

    // 1. Server Search
    const search = ((req.query.search || req.query.q || '') as string).trim().toLowerCase();
    if (search) {
      list = list.filter(
        (e) =>
          e.code.toLowerCase().includes(search) ||
          e.name.toLowerCase().includes(search) ||
          e.position.toLowerCase().includes(search) ||
          e.department.toLowerCase().includes(search) ||
          e.email.toLowerCase().includes(search) ||
          e.phone.includes(search)
      );
    }

    // 2. Filter Status
    const status = ((req.query.status || '') as string).trim();
    if (status && status !== 'all') {
      list = list.filter((e) => e.status === status);
    }

    // 3. Filter Department
    const department = ((req.query.department || '') as string).trim();
    if (department && department !== 'all') {
      list = list.filter((e) => e.department === department);
    }

    // 4. Server Pagination
    const total = list.length;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 5);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const validPage = Math.min(page, totalPages);
    const startIndex = (validPage - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      employees: paginated,
      data: paginated,
      pagination: {
        page: validPage,
        limit,
        total,
        totalPages,
        hasPrevPage: validPage > 1,
        hasNextPage: validPage < totalPages
      }
    });
  });

  // Create employee
  app.post('/api/employees', (req: Request, res: Response) => {
    const { name, position, department, email, phone, status = 'active' } = req.body;
    if (!name || !email) {
      res.status(400).json({ success: false, message: 'Họ tên và email là bắt buộc' });
      return;
    }

    const nextId = 'emp_' + (employees.length + 1) + '_' + Date.now().toString(36).slice(-3);
    const nextCode = 'HR-' + String(employees.length + 1).padStart(3, '0');
    const newEmp: ServerEmployee = {
      id: nextId,
      code: nextCode,
      name,
      position: position || 'Nhân viên',
      department: department || 'Ban Nhân Sự & Đào Tạo',
      email,
      phone: phone || '0900 000 000',
      joinDate: new Date().toISOString().split('T')[0],
      status: status as any
    };

    employees.unshift(newEmp);
    recordLog('HR_CREATE', `Thêm mới nhân sự "${name}" (${nextCode})`, 'admin@system.com', req);

    res.status(201).json({ success: true, message: 'Thêm nhân sự thành công', data: newEmp });
  });

  // Update employee
  app.put('/api/employees/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const empIndex = employees.findIndex((e) => e.id === id);
    if (empIndex === -1) {
      res.status(404).json({ success: false, message: 'Không tìm thấy nhân sự' });
      return;
    }

    const { name, position, department, email, phone, status } = req.body;
    if (name) employees[empIndex].name = name;
    if (position) employees[empIndex].position = position;
    if (department) employees[empIndex].department = department;
    if (email) employees[empIndex].email = email;
    if (phone) employees[empIndex].phone = phone;
    if (status) employees[empIndex].status = status;

    recordLog('HR_UPDATE', `Cập nhật hồ sơ nhân sự "${employees[empIndex].name}"`, 'admin@system.com', req);
    res.json({ success: true, message: 'Cập nhật nhân sự thành công', data: employees[empIndex] });
  });

  // Delete employee
  app.delete('/api/employees/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const empIndex = employees.findIndex((e) => e.id === id);
    if (empIndex === -1) {
      res.status(404).json({ success: false, message: 'Không tìm thấy nhân sự' });
      return;
    }

    const [deleted] = employees.splice(empIndex, 1);
    recordLog('HR_REMOVE', `Xóa hồ sơ nhân sự "${deleted.name}" (${deleted.code})`, 'admin@system.com', req);
    res.json({ success: true, message: `Đã xóa nhân sự "${deleted.name}"` });
  });

  // 11. RESET DATA TO INITIAL
  app.post('/api/seed-reset', (_req: Request, res: Response) => {
    users = JSON.parse(JSON.stringify(INITIAL_USERS));
    roles = JSON.parse(JSON.stringify(INITIAL_ROLES));
    auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    documentTypes = JSON.parse(JSON.stringify(INITIAL_DOCUMENT_TYPES));
    res.json({ success: true, message: 'Dữ liệu đã được khôi phục về trạng thái ban đầu' });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

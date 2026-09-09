import { User, Role, PermissionModule, PermissionGroup, PermissionItem } from '../src/types';

/**
 * Bảng PERMISSION_GROUPS chính xác theo dữ liệu trong Database Supabase
 */
export const DB_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 1,
    group_name: 'USER',
    description: 'Quản lý người dùng',
    created_at: '2026-09-07 03:40:44.34066'
  },
  {
    id: 2,
    group_name: 'HR',
    description: 'Quản lý nhân sự',
    created_at: '2026-09-07 03:40:44.34066'
  },
  {
    id: 3,
    group_name: 'RP',
    description: 'Báo cáo & Thống kê',
    created_at: '2026-09-08 02:10:22.55843'
  },
  {
    id: 4,
    group_name: 'PERM',
    description: 'Quản lý phân quyền',
    created_at: '2026-09-08 02:17:00.03783'
  },
  {
    id: 5,
    group_name: 'DOC',
    description: 'Quản lý tài liệu',
    created_at: '2026-09-08 02:17:49.57223'
  }
];

/**
 * Bảng PERMISSIONS chính xác 20 bản ghi theo Database Supabase
 */
export const DB_PERMISSIONS: PermissionItem[] = [
  // Group 2: HR (Quản lý nhân sự)
  {
    id: 1,
    group_id: 2,
    permission_code: 'HR_CREATE',
    permission_name: 'Tạo mới',
    code: 'HR_CREATE',
    name: 'Tạo mới',
    description: 'Tạo hồ sơ nhân sự mới trong hệ thống HR',
    module: 'HR'
  },
  {
    id: 2,
    group_id: 2,
    permission_code: 'HR_UPDATE',
    permission_name: 'Cập nhật',
    code: 'HR_UPDATE',
    name: 'Cập nhật',
    description: 'Cập nhật thông tin hợp đồng, vị trí nhân sự',
    module: 'HR'
  },
  {
    id: 3,
    group_id: 2,
    permission_code: 'HR_VIEW',
    permission_name: 'Xem thông tin',
    code: 'HR_VIEW',
    name: 'Xem thông tin',
    description: 'Xem danh sách và hồ sơ nhân sự',
    module: 'HR'
  },
  {
    id: 4,
    group_id: 2,
    permission_code: 'HR_REMOVE',
    permission_name: 'Xóa',
    code: 'HR_REMOVE',
    name: 'Xóa',
    description: 'Xóa hồ sơ nhân sự',
    module: 'HR'
  },

  // Group 3: RP (Báo cáo & Thống kê)
  {
    id: 5,
    group_id: 3,
    permission_code: 'REPORT_CREATE',
    permission_name: 'Tạo mới',
    code: 'REPORT_CREATE',
    name: 'Tạo mới',
    description: 'Tạo và xuất báo cáo thống kê mới',
    module: 'RP'
  },
  {
    id: 6,
    group_id: 3,
    permission_code: 'REPORT_UPDATE',
    permission_name: 'Cập nhật',
    code: 'REPORT_UPDATE',
    name: 'Cập nhật',
    description: 'Cập nhật cấu hình biểu đồ và báo cáo',
    module: 'RP'
  },
  {
    id: 7,
    group_id: 3,
    permission_code: 'REPORT_VIEW',
    permission_name: 'Xem thông tin',
    code: 'REPORT_VIEW',
    name: 'Xem thông tin',
    description: 'Xem các bảng biểu, số liệu thống kê',
    module: 'RP'
  },
  {
    id: 8,
    group_id: 3,
    permission_code: 'REPORT_REMOVE',
    permission_name: 'Xóa',
    code: 'REPORT_REMOVE',
    name: 'Xóa',
    description: 'Xóa báo cáo lưu trữ',
    module: 'RP'
  },

  // Group 1: USER (Quản lý người dùng)
  {
    id: 9,
    group_id: 1,
    permission_code: 'USER_CREATE',
    permission_name: 'Tạo mới',
    code: 'USER_CREATE',
    name: 'Tạo mới',
    description: 'Thêm tài khoản người dùng mới vào hệ thống',
    module: 'USER'
  },
  {
    id: 10,
    group_id: 1,
    permission_code: 'USER_UPDATE',
    permission_name: 'Cập nhật',
    code: 'USER_UPDATE',
    name: 'Cập nhật',
    description: 'Cập nhật thông tin, trạng thái, đổi vai trò người dùng',
    module: 'USER'
  },
  {
    id: 11,
    group_id: 1,
    permission_code: 'USER_VIEW',
    permission_name: 'Xem thông tin',
    code: 'USER_VIEW',
    name: 'Xem thông tin',
    description: 'Xem danh sách và chi tiết người dùng',
    module: 'USER'
  },
  {
    id: 12,
    group_id: 1,
    permission_code: 'USER_REMOVE',
    permission_name: 'Xóa',
    code: 'USER_REMOVE',
    name: 'Xóa',
    description: 'Xóa tài khoản người dùng khỏi hệ thống',
    module: 'USER'
  },

  // Group 4: PERM (Quản lý phân quyền)
  {
    id: 13,
    group_id: 4,
    permission_code: 'PERM_CREATE',
    permission_name: 'Tạo mới',
    code: 'PERM_CREATE',
    name: 'Tạo mới',
    description: 'Tạo vai trò mới trong hệ thống',
    module: 'PERM'
  },
  {
    id: 14,
    group_id: 4,
    permission_code: 'PERM_UPDATE',
    permission_name: 'Cập nhật',
    code: 'PERM_UPDATE',
    name: 'Cập nhật',
    description: 'Gán và cập nhật ma trận quyền cho vai trò',
    module: 'PERM'
  },
  {
    id: 15,
    group_id: 4,
    permission_code: 'PERM_VIEW',
    permission_name: 'Xem thông tin',
    code: 'PERM_VIEW',
    name: 'Xem thông tin',
    description: 'Xem cây phân quyền và danh sách vai trò',
    module: 'PERM'
  },
  {
    id: 16,
    group_id: 4,
    permission_code: 'PERM_REMOVE',
    permission_name: 'Xóa',
    code: 'PERM_REMOVE',
    name: 'Xóa',
    description: 'Xóa vai trò tùy chỉnh',
    module: 'PERM'
  },

  // Group 5: DOC (Quản lý tài liệu)
  {
    id: 17,
    group_id: 5,
    permission_code: 'DOC_CREATE',
    permission_name: 'Tạo mới',
    code: 'DOC_CREATE',
    name: 'Tạo mới',
    description: 'Tải lên tài liệu và văn bản nghiệp vụ mới',
    module: 'DOC'
  },
  {
    id: 18,
    group_id: 5,
    permission_code: 'DOC_UPDATE',
    permission_name: 'Cập nhật',
    code: 'DOC_UPDATE',
    name: 'Cập nhật',
    description: 'Cập nhật nội dung, metadata tài liệu',
    module: 'DOC'
  },
  {
    id: 19,
    group_id: 5,
    permission_code: 'DOC_VIEW',
    permission_name: 'Xem thông tin',
    code: 'DOC_VIEW',
    name: 'Xem thông tin',
    description: 'Xem danh sách và đọc tài liệu',
    module: 'DOC'
  },
  {
    id: 20,
    group_id: 5,
    permission_code: 'DOC_REMOVE',
    permission_name: 'Xóa',
    code: 'DOC_REMOVE',
    name: 'Xóa',
    description: 'Xóa tài liệu khỏi kho lưu trữ',
    module: 'DOC'
  }
];

/**
 * Cấu trúc phân nhóm Module dạng cây (Tree Structure) dựa trên permission_groups và permissions
 */
export const INITIAL_PERMISSION_MODULES: PermissionModule[] = DB_PERMISSION_GROUPS.map((group) => {
  const groupPerms = DB_PERMISSIONS.filter((p) => p.group_id === group.id).sort((a, b) => {
    // Thứ tự hiển thị thân thiện: VIEW -> CREATE -> UPDATE -> REMOVE
    const order = ['VIEW', 'CREATE', 'UPDATE', 'REMOVE'];
    const getOrderIdx = (code: string) => order.findIndex((o) => code.endsWith(o));
    return getOrderIdx(a.permission_code) - getOrderIdx(b.permission_code);
  });

  const iconMap: Record<string, string> = {
    USER: 'Users',
    HR: 'UserCheck',
    RP: 'BarChart3',
    PERM: 'ShieldCheck',
    DOC: 'FileText'
  };

  return {
    id: group.group_name.toLowerCase(),
    group_id: group.id,
    group_name: group.group_name,
    name: `${group.description} (${group.group_name})`,
    description: group.description,
    iconName: iconMap[group.group_name] || 'ShieldCheck',
    permissions: groupPerms
  };
});

export const ALL_PERMISSION_CODES = DB_PERMISSIONS.map((p) => p.permission_code);

export const INITIAL_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Quản Trị Viên (Admin)',
    description: 'Toàn quyền cấu hình hệ thống, quản lý người dùng và cấp phát quyền',
    isSystem: true,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    permissions: [...ALL_PERMISSION_CODES]
  },
  {
    id: 'manager',
    name: 'Trưởng Phòng (Manager)',
    description: 'Quản lý người dùng, nhân sự, kiểm duyệt báo cáo và tài liệu',
    isSystem: false,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: [
      'USER_VIEW',
      'USER_CREATE',
      'USER_UPDATE',
      'HR_VIEW',
      'HR_CREATE',
      'HR_UPDATE',
      'REPORT_VIEW',
      'REPORT_CREATE',
      'DOC_VIEW',
      'DOC_CREATE',
      'DOC_UPDATE'
    ]
  },
  {
    id: 'staff',
    name: 'Nhân Viên Nghiệp Vụ (Staff)',
    description: 'Thực hiện công việc báo cáo, hồ sơ nhân sự và tra cứu tài liệu',
    isSystem: false,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    permissions: [
      'HR_VIEW',
      'REPORT_VIEW',
      'DOC_VIEW',
      'DOC_CREATE'
    ]
  },
  {
    id: 'viewer',
    name: 'Khách Tra Cứu (Viewer)',
    description: 'Chỉ có quyền đọc và tra cứu tài liệu, báo cáo',
    isSystem: false,
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    permissions: [
      'REPORT_VIEW',
      'DOC_VIEW'
    ]
  }
];

export interface StoredUser extends User {
  passwordHash: string;
}

export const INITIAL_USERS: StoredUser[] = [
  {
    id: 'usr_admin',
    email: 'admin@system.com',
    passwordHash: 'Admin@123',
    name: 'Nguyễn Quản Trị (Admin)',
    roleId: 'admin',
    is_first_login: false,
    department: 'Trung tâm Quản trị & Hạ tầng',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-07 03:40:44'
  },
  {
    id: 'usr_firstlogin',
    email: 'user.firstlogin@system.com',
    passwordHash: 'Temp@12345',
    name: 'Đặng Tuấn Anh (Tân Nhân Viên)',
    roleId: 'staff',
    is_first_login: true, // Test case: Bắt buộc đổi mật khẩu ngay lần đầu!
    department: 'Phòng Phát Triển Nghiệp Vụ',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-08 02:15:00'
  },
  {
    id: 'usr_manager',
    email: 'manager@system.com',
    passwordHash: 'Manager@123',
    name: 'Trần Thị Mai (Trưởng Phòng)',
    roleId: 'manager',
    is_first_login: false,
    department: 'Ban Kế Hoạch & Vận Hành',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-07 08:30:00'
  },
  {
    id: 'usr_staff',
    email: 'staff@system.com',
    passwordHash: 'Staff@123',
    name: 'Lê Hoàng Nam (Chuyên Viên)',
    roleId: 'staff',
    is_first_login: false,
    department: 'Tổ Tác Nghiệp Báo Cáo',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-07 09:00:00'
  },
  {
    id: 'usr_5',
    email: 'pham.van.dung@system.com',
    passwordHash: 'Password@123',
    name: 'Phạm Văn Dũng',
    roleId: 'manager',
    is_first_login: false,
    department: 'Phòng Tài Chính - Kế Toán',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-05 10:15:00'
  },
  {
    id: 'usr_6',
    email: 'hoang.minh.tri@system.com',
    passwordHash: 'Password@123',
    name: 'Hoàng Minh Trí',
    roleId: 'staff',
    is_first_login: false,
    department: 'Trung tâm Phát triển Phần mềm',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-04 14:20:00'
  },
  {
    id: 'usr_7',
    email: 'nguyen.thanh.huong@system.com',
    passwordHash: 'Password@123',
    name: 'Nguyễn Thanh Hương',
    roleId: 'staff',
    is_first_login: false,
    department: 'Ban Quản Trị Nhân Sự',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-03 08:45:00'
  },
  {
    id: 'usr_8',
    email: 'do.quang.huy@system.com',
    passwordHash: 'Password@123',
    name: 'Đỗ Quang Huy',
    roleId: 'viewer',
    is_first_login: false,
    department: 'Khối Giám Sát Tuân Thủ',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-02 11:30:00'
  },
  {
    id: 'usr_9',
    email: 'vu.thi.bich@system.com',
    passwordHash: 'Password@123',
    name: 'Vũ Thị Bích',
    roleId: 'staff',
    is_first_login: false,
    department: 'Tổ Quản Trị Tài Liệu & Hồ Sơ',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-01 16:00:00'
  },
  {
    id: 'usr_10',
    email: 'bui.hoang.viet@system.com',
    passwordHash: 'Password@123',
    name: 'Bùi Hoàng Việt',
    roleId: 'manager',
    is_first_login: false,
    department: 'Ban Kỹ Thuật & An Toàn Thông Tin',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-08-28 09:10:00'
  },
  {
    id: 'usr_11',
    email: 'dinh.thu.hang@system.com',
    passwordHash: 'Password@123',
    name: 'Đinh Thu Hằng',
    roleId: 'staff',
    is_first_login: false,
    department: 'Phòng Pháp Chế Doanh Nghiệp',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-08-25 15:40:00'
  },
  {
    id: 'usr_12',
    email: 'ngo.van.khang@system.com',
    passwordHash: 'Password@123',
    name: 'Ngô Văn Khang',
    roleId: 'viewer',
    is_first_login: false,
    department: 'Văn Phòng Ban Giám Đốc',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-08-20 13:20:00'
  }
];

export interface AuditLog {
  id: string;
  action: string;
  detail: string;
  performedBy: string;
  timestamp: string;
  ip: string;
}

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_1',
    action: 'INIT_SYSTEM',
    detail: 'Khởi tạo hệ thống với 5 nhóm quyền và 20 mã quyền từ Supabase DB',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-07T03:40:44.000Z',
    ip: '127.0.0.1'
  },
  {
    id: 'log_2',
    action: 'CREATE_USER',
    detail: 'Tạo tài khoản mới user.firstlogin@system.com với cờ is_first_login=true',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T02:15:00.000Z',
    ip: '127.0.0.1'
  },
  {
    id: 'log_3',
    action: 'USER_LOGIN',
    detail: 'Người dùng admin@system.com đăng nhập thành công vào trang quản trị',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T03:10:12.000Z',
    ip: '192.168.1.102'
  },
  {
    id: 'log_4',
    action: 'UPDATE_ROLE_PERMISSIONS',
    detail: 'Cập nhật ma trận phân quyền cho vai trò "Trưởng Phòng (Manager)": 11 quyền',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T04:22:15.000Z',
    ip: '192.168.1.102'
  },
  {
    id: 'log_5',
    action: 'DOCUMENT_IMAGE_UPLOAD',
    detail: 'Tải lên hình ảnh "Hop_dong_kinh_te_scan_p1.jpg" vào loại "Hợp đồng kinh tế"',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T05:00:20.000Z',
    ip: '192.168.1.102'
  },
  {
    id: 'log_6',
    action: 'DOCUMENT_EXPORT',
    detail: 'Xuất tệp hồ sơ "Ho_So_Xuat_HD_KT_2026.pdf" (3 hình ảnh) kèm chữ ký số',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T05:45:00.000Z',
    ip: '192.168.1.102'
  },
  {
    id: 'log_7',
    action: 'HR_CREATE',
    detail: 'Thêm mới hồ sơ nhân sự "Nguyễn Văn Hùng" - Chuyên viên Tuyển dụng Cao cấp',
    performedBy: 'manager@system.com',
    timestamp: '2026-09-08T06:12:30.000Z',
    ip: '192.168.1.115'
  },
  {
    id: 'log_8',
    action: 'RESET_FIRST_LOGIN_FLAG',
    detail: 'Đặt lại mật khẩu tạm và bật cờ is_first_login cho tài khoản tân nhân viên',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T06:30:10.000Z',
    ip: '127.0.0.1'
  },
  {
    id: 'log_9',
    action: 'CREATE_ROLE',
    detail: 'Tạo vai trò mới "Chuyên Viên Pháp Chế" với quyền kiểm tra hợp đồng',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T06:55:00.000Z',
    ip: '192.168.1.102'
  },
  {
    id: 'log_10',
    action: 'PASSWORD_CHANGED',
    detail: 'Tài khoản user.firstlogin@system.com đổi mật khẩu lần đầu và kích hoạt',
    performedBy: 'user.firstlogin@system.com',
    timestamp: '2026-09-08T07:15:22.000Z',
    ip: '192.168.1.140'
  },
  {
    id: 'log_11',
    action: 'DOCUMENT_EXPORT',
    detail: 'Xuất danh mục bảng kê hồ sơ định dạng Excel cho Ban Giám Đốc',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T07:30:45.000Z',
    ip: '192.168.1.102'
  },
  {
    id: 'log_12',
    action: 'USER_UPDATE',
    detail: 'Cập nhật chức danh và phòng ban cho nhân sự Nguyễn Thanh Hương',
    performedBy: 'admin@system.com',
    timestamp: '2026-09-08T07:45:10.000Z',
    ip: '192.168.1.102'
  }
];

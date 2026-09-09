import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Building2,
  CheckCircle2,
  Lock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import withAuthorization from '../components/guards/withAuthorization';
import Can from '../components/guards/Can';
import { useAuth } from '../context/AuthContext';
import { notify } from '../stores/notificationStore';
import { Employee } from '../types';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee
} from '../hooks/useApiQueries';
import { useDebounce } from '../hooks/useDebounce';
import Pagination from '../components/common/Pagination';

const HRPageComponent: React.FC = () => {
  const { hasPermission, role: currentUserRole } = useAuth();

  // Search & Pagination state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('Ban Nhân Sự & Đào Tạo');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Reset về page 1 khi đổi tìm kiếm
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Query nhân viên từ Server
  const {
    data: empData,
    isLoading,
    isFetching,
    refetch
  } = useEmployees({
    page,
    limit,
    search: debouncedSearch
  });

  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();

  const employees = empData?.employees || [];
  const pagination = empData?.pagination || {
    page: 1,
    limit: 5,
    total: employees.length,
    totalPages: 1
  };

  const canCreate = hasPermission('HR_CREATE') || currentUserRole?.id === 'admin';
  const canUpdate = hasPermission('HR_UPDATE') || currentUserRole?.id === 'admin';
  const canRemove = hasPermission('HR_REMOVE') || currentUserRole?.id === 'admin';

  const handleOpenCreate = () => {
    setEditingEmp(null);
    setName('');
    setPosition('');
    setDepartment('Ban Nhân Sự & Đào Tạo');
    setEmail('');
    setPhone('');
    setShowModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setPosition(emp.position);
    setDepartment(emp.department);
    setEmail(emp.email);
    setPhone(emp.phone);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingEmp) {
      // HR_UPDATE
      await updateEmployeeMutation.mutateAsync({
        id: editingEmp.id,
        data: { name, position, department, email, phone }
      });
    } else {
      // HR_CREATE
      await createEmployeeMutation.mutateAsync({
        name,
        position: position || 'Nhân viên mới',
        department,
        email,
        phone: phone || 'Chưa cập nhật',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'probation'
      });
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string, empName: string) => {
    if (!canRemove) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ nhân sự "${empName}" (HR_REMOVE)?`)) return;

    await deleteEmployeeMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Quản Lý Nhân Sự (Nhóm HR)
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Group ID: 2
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Quản lý hồ sơ nhân viên, hợp đồng và chính sách với mã quyền:{' '}
              <code className="text-[11px] font-mono font-semibold text-teal-700">HR_VIEW</code>,{' '}
              <code className="text-[11px] font-mono font-semibold text-teal-700">HR_CREATE</code>,{' '}
              <code className="text-[11px] font-mono font-semibold text-teal-700">HR_UPDATE</code>,{' '}
              <code className="text-[11px] font-mono font-semibold text-teal-700">HR_REMOVE</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <Can
            do="HR_CREATE"
            fallback={
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-400 cursor-not-allowed"
                title="Cần quyền HR_CREATE"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Thêm Nhân Sự (Bị Khóa)</span>
              </button>
            }
          >
            <button
              type="button"
              id="btn-add-hr-employee"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhân Sự Mới</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-server-search-hr"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã nhân sự, tên, vị trí, email trên máy chủ..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
          {isFetching && (
            <Loader2 className="w-3.5 h-3.5 text-teal-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>
        <div className="text-xs text-slate-500">
          Tổng số: <strong className="text-slate-800">{pagination.total}</strong> nhân sự trên máy chủ
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Đang tải danh sách nhân sự từ máy chủ...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Mã NV</th>
                  <th className="px-5 py-3.5">Họ & Tên Nhân Sự</th>
                  <th className="px-5 py-3.5">Vị Trí & Phòng Ban</th>
                  <th className="px-5 py-3.5">Thông Tin Liên Hệ</th>
                  <th className="px-5 py-3.5">Trạng Thái</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      Không tìm thấy nhân sự phù hợp trên máy chủ.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] border border-slate-200">
                          {emp.code}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{emp.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Gia nhập: {emp.joinDate}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-slate-800 font-medium flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                          {emp.position}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {emp.department}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {emp.email}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {emp.phone}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            emp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : emp.status === 'probation'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {emp.status === 'active'
                            ? 'Chính thức'
                            : emp.status === 'probation'
                            ? 'Thử việc'
                            : 'Nghỉ việc'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Can do="HR_UPDATE">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Cập nhật thông tin (HR_UPDATE)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </Can>

                          <Can do="HR_REMOVE">
                            <button
                              type="button"
                              onClick={() => handleDelete(emp.id, emp.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa nhân sự (HR_REMOVE)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination */}
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemName="nhân sự"
          isLoading={isFetching}
        />
      </div>

      {/* Modal: Thêm / Sửa Nhân Sự */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingEmp ? 'Cập Nhật Hồ Sơ Nhân Sự (HR_UPDATE)' : 'Thêm Nhân Sự Mới (HR_CREATE)'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập các thông tin nhân sự để lưu trữ trong phân hệ HR
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Minh Đức"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vị trí công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Ví dụ: Chuyên viên Nhân sự, Chuyên viên Tuyển dụng"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phòng ban
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.com"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {editingEmp ? 'Lưu Cập Nhật' : 'Tạo Nhân Sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const HRPage = withAuthorization(HRPageComponent, 'HR_VIEW');
export default HRPage;

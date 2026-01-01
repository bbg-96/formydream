import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Task, TaskStatus, TaskPriority } from '../types';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  
  // Stats Calculation
  const statusCounts = [
    { name: 'To Do', value: tasks.filter(t => t.status === TaskStatus.TODO).length },
    { name: 'In Progress', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Review', value: tasks.filter(t => t.status === TaskStatus.REVIEW).length },
    { name: 'Done', value: tasks.filter(t => t.status === TaskStatus.DONE).length },
  ];

  const priorityCounts = [
    { name: 'Low', count: tasks.filter(t => t.priority === TaskPriority.LOW).length },
    { name: 'Medium', count: tasks.filter(t => t.priority === TaskPriority.MEDIUM).length },
    { name: 'High', count: tasks.filter(t => t.priority === TaskPriority.HIGH).length },
    { name: 'Critical', count: tasks.filter(t => t.priority === TaskPriority.CRITICAL).length },
  ];

  const urgentTasks = tasks
    .filter(t => (t.priority === TaskPriority.CRITICAL || t.priority === TaskPriority.HIGH) && t.status !== TaskStatus.DONE)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800">CloudOps 개요</h2>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">진행 중인 작업</p>
            <p className="text-2xl font-bold">{tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-lg text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">긴급 이슈</p>
            <p className="text-2xl font-bold">{tasks.filter(t => t.priority === TaskPriority.CRITICAL && t.status !== TaskStatus.DONE).length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">완료된 작업</p>
            <p className="text-2xl font-bold">{tasks.filter(t => t.status === TaskStatus.DONE).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">작업 상태 현황</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">우선순위 분포</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityCounts}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Urgent Tasks List */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">긴급 처리 필요</h3>
        <div className="space-y-3">
          {urgentTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">현재 긴급한 작업이 없습니다.</p>
          ) : (
            urgentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-200 rounded">{task.priority}</span>
                  <span className="font-medium text-gray-800">{task.title}</span>
                </div>
                <span className="text-sm text-gray-500">{task.dueDate || 'No Due Date'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

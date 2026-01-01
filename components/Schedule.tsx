import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types';

interface ScheduleProps {
  tasks: Task[];
}

export const Schedule: React.FC<ScheduleProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/50 border border-gray-100"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = new Date().toISOString().split('T')[0] === dateString;
      
      const dayTasks = tasks.filter(task => task.dueDate === dateString);

      days.push(
        <div key={day} className={`h-32 border border-gray-100 p-2 flex flex-col hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}>
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
              {day}
            </span>
            {dayTasks.length > 0 && (
              <span className="text-[10px] text-gray-400 font-mono">
                {dayTasks.length} tasks
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            {dayTasks.map(task => (
              <div 
                key={task.id} 
                className={`text-[10px] p-1.5 rounded border truncate cursor-pointer shadow-sm hover:opacity-80 transition-opacity
                  ${task.priority === TaskPriority.CRITICAL ? 'bg-red-50 text-red-700 border-red-200 font-bold' : ''}
                  ${task.priority === TaskPriority.HIGH ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                  ${task.priority === TaskPriority.MEDIUM ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                  ${task.priority === TaskPriority.LOW ? 'bg-gray-50 text-gray-600 border-gray-200' : ''}
                  ${task.status === TaskStatus.DONE ? 'opacity-50 line-through' : ''}
                `}
                title={task.title}
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-blue-600" /> 
          일정 관리
        </h2>
        
        <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold min-w-[140px] text-center text-gray-800">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
          {renderCalendarDays()}
        </div>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-end">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>Critical</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>High</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>Medium</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>Low</div>
      </div>
    </div>
  );
};
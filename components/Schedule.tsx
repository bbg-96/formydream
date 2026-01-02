import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types';

interface ScheduleProps {
  tasks: Task[];
}

export const Schedule: React.FC<ScheduleProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Added separate state for selected date in mobile view
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  // Get tasks for the specifically selected date (for mobile list view)
  const selectedDateTasks = tasks.filter(task => task.dueDate === selectedDate);

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[50px] md:h-32 bg-gray-50/50 border border-gray-100"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = new Date().toISOString().split('T')[0] === dateString;
      const isSelected = selectedDate === dateString;
      
      const dayTasks = tasks.filter(task => task.dueDate === dateString);
      const hasCritical = dayTasks.some(t => t.priority === TaskPriority.CRITICAL);

      days.push(
        <div 
            key={day} 
            onClick={() => setSelectedDate(dateString)}
            className={`
                min-h-[50px] md:h-32 border border-gray-100 p-1 md:p-2 flex flex-col transition-colors cursor-pointer
                ${isSelected ? 'bg-blue-50 ring-1 ring-blue-300 z-10' : 'hover:bg-slate-50 bg-white'}
                ${isToday ? 'bg-blue-50/30' : ''}
            `}
        >
          <div className="flex justify-center md:justify-between items-start mb-1">
            <span className={`text-xs md:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
              {day}
            </span>
            {/* Desktop: Task count */}
            {dayTasks.length > 0 && (
              <span className="hidden md:inline text-[10px] text-gray-400 font-mono">
                {dayTasks.length} tasks
              </span>
            )}
            {/* Mobile: Dot indicator */}
            {dayTasks.length > 0 && (
                <div className="md:hidden flex gap-0.5 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${hasCritical ? 'bg-red-500' : 'bg-blue-400'}`}></div>
                </div>
            )}
          </div>
          
          {/* Desktop: Task List inside cell */}
          <div className="hidden md:flex flex-1 overflow-y-auto flex-col gap-1 custom-scrollbar">
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
    <div className="h-full flex flex-col p-4 md:p-6 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-6 gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2 self-start md:self-auto">
          <CalendarIcon className="text-blue-600" /> 
          일정 관리
        </h2>
        
        <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto justify-between md:justify-start">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <span className="text-base md:text-lg font-semibold min-w-[140px] text-center text-gray-800">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden mb-4 md:mb-0">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-2 md:py-3 text-center text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Mobile: Selected Date Task List (Below Calendar) */}
      <div className="md:hidden bg-white rounded-xl border border-gray-200 p-4 shadow-sm max-h-[40%] overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2 flex justify-between items-center">
              <span>{selectedDate} 일정</span>
              <span className="text-xs text-gray-500">{selectedDateTasks.length}건</span>
          </h3>
          {selectedDateTasks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">일정이 없습니다.</p>
          ) : (
              <div className="space-y-2">
                  {selectedDateTasks.map(task => (
                    <div 
                        key={task.id}
                        className={`p-3 rounded-lg border text-sm flex items-center justify-between
                        ${task.priority === TaskPriority.CRITICAL ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full 
                                ${task.priority === TaskPriority.CRITICAL ? 'bg-red-500' : 
                                  task.priority === TaskPriority.HIGH ? 'bg-orange-500' : 'bg-blue-400'}`} 
                             />
                             <span className={`${task.status === TaskStatus.DONE ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                 {task.title}
                             </span>
                        </div>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{task.status}</span>
                    </div>
                  ))}
              </div>
          )}
      </div>

      {/* Legend (Desktop Only) */}
      <div className="hidden md:flex mt-4 gap-4 text-xs text-gray-500 justify-end">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>Critical</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>High</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>Medium</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>Low</div>
      </div>
    </div>
  );
};
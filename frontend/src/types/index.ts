// Type definitions for School Timetable Frontend

export interface Class {
  id: number;
  name: string;
  level: string;
  stream: string | null;
  created_at: string;
}

export interface Teacher {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Classroom {
  id: number;
  name: string;
  capacity: number | null;
  location: string | null;
  created_at: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string | null;
  created_at: string;
}

export interface TimetableEntry {
  id: number;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  classroom_id: number;
  classroom_name: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_temporary: boolean;
  temporary_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrentSession {
  id: number;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  classroom_id: number;
  classroom_name: string;
  start_time: string;
  end_time: string;
  is_temporary: boolean;
  temporary_date: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  text_content: string | null;
  image_path: string | null;
  image_data: any | null;
  has_image_data?: boolean;
  image_mime_type: string | null;
  image_url: string;
  display_order: number;
  is_active: boolean;
  is_approved_for_display: boolean;
  expires_at: string | null;
  created_at: string;
  is_expired?: boolean;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'viewer';
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    current_time?: string;
    current_day?: number;
    current_date?: string;
    count?: number;
  };
}

export interface ReferenceData {
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  classrooms: Classroom[];
}

export interface DisplayConfig {
  display_id: string;
  name: string;
  filter_classes: string | null;
  filter_levels: string | null;
  rotation_speed: number;
  theme: 'light' | 'dark';
  language: string;
}

export type Language = 'en' | 'fr' | 'sw';

export interface Translations {
  [key: string]: {
    en: string;
    fr: string;
    sw: string;
  };
}

"use client";

import { useAuth } from "@/store/auth-store";

// Admin sections
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminAccounts } from "@/components/admin/admin-accounts";
import { AdminSubjects } from "@/components/admin/admin-subjects";
import { AdminGrades } from "@/components/admin/admin-grades";
import { AdminResults } from "@/components/admin/admin-results";
import { AdminSections } from "@/components/admin/admin-sections";

// Teacher sections
import { TeacherDashboard } from "@/components/teacher/teacher-dashboard";
import { TeacherSubjects } from "@/components/teacher/teacher-subjects";
import { TeacherStudents } from "@/components/teacher/teacher-students";
import { TeacherGrades } from "@/components/teacher/teacher-grades";
import { TeacherResults } from "@/components/teacher/teacher-results";

// Student sections
import { StudentDashboard } from "@/components/student/student-dashboard";
import { StudentGrades } from "@/components/student/student-grades";
import { StudentReport } from "@/components/student/student-report";
import { StudentProfile } from "@/components/student/student-profile";

export function ViewRouter() {
  const view = useAuth((s) => s.view);

  switch (view) {
    // Admin
    case "admin.dashboard": return <AdminDashboard />;
    case "admin.accounts": return <AdminAccounts />;
    case "admin.subjects": return <AdminSubjects />;
    case "admin.grades": return <AdminGrades />;
    case "admin.results": return <AdminResults />;
    case "admin.sections": return <AdminSections />;
    // Teacher
    case "teacher.dashboard": return <TeacherDashboard />;
    case "teacher.subjects": return <TeacherSubjects />;
    case "teacher.students": return <TeacherStudents />;
    case "teacher.grades": return <TeacherGrades />;
    case "teacher.results": return <TeacherResults />;
    // Student
    case "student.dashboard": return <StudentDashboard />;
    case "student.grades": return <StudentGrades />;
    case "student.report": return <StudentReport />;
    case "student.profile": return <StudentProfile />;
    default: return null;
  }
}
